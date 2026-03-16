import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_MAP: Record<string, string> = {
  manutencao: "manutencao",
  manutenção: "manutencao",
  pneu: "manutencao",
  óleo: "manutencao",
  oleo: "manutencao",
  freio: "manutencao",
  combustível: "manutencao",
  combustivel: "manutencao",
  seguro: "seguro",
  imposto: "imposto",
  ipva: "imposto",
  financiamento: "financiamento",
  parcela: "financiamento",
  salário: "salario",
  salario: "salario",
  fgts: "fgts",
  contador: "contador",
  rastreador: "rastreador",
  diária: "diaria",
  diaria: "diaria",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse incoming message - support both Twilio webhook (form-encoded) and JSON
    let messageBody = "";
    let senderNumber = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      messageBody = formData.get("Body")?.toString() || "";
      senderNumber = formData.get("From")?.toString() || "";
    } else {
      const json = await req.json();
      messageBody = json.message || json.Body || "";
      senderNumber = json.from || json.From || "manual";
    }

    if (!messageBody.trim()) {
      return new Response(
        JSON.stringify({ error: "Mensagem vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to interpret the message
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de gestão de frota. Interprete mensagens de WhatsApp sobre gastos/despesas de uma empresa de transporte com vans.

Extraia as seguintes informações:
- date: data do gasto (formato YYYY-MM-DD, use a data de hoje ${new Date().toISOString().split("T")[0]} se não especificada)
- category: categoria (uma de: manutencao, seguro, imposto, financiamento, salario, fgts, contador, rastreador, diaria, outros)
- description: descrição curta do gasto
- vehicle: veículo relacionado (ex: "Van 01", "Van 02", "Geral" se não especificado)
- amount: valor em reais (número decimal)
- status: "pago" ou "pendente" (default: "pago")

Se a mensagem não parecer um registro de gasto, retorne category como "invalid".`,
          },
          { role: "user", content: messageBody },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "register_expense",
              description: "Registra um gasto no sistema",
              parameters: {
                type: "object",
                properties: {
                  date: { type: "string", description: "Data YYYY-MM-DD" },
                  category: {
                    type: "string",
                    enum: [
                      "manutencao", "seguro", "imposto", "financiamento",
                      "salario", "fgts", "contador", "rastreador", "diaria", "outros", "invalid",
                    ],
                  },
                  description: { type: "string" },
                  vehicle: { type: "string" },
                  amount: { type: "number" },
                  status: { type: "string", enum: ["pago", "pendente"] },
                },
                required: ["date", "category", "description", "vehicle", "amount", "status"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "register_expense" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    if (parsed.category === "invalid") {
      // Return Twilio-compatible TwiML for non-expense messages
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❓ Não entendi como um registro de gasto. Envie algo como: "Troca de pneus Van 01 R$450"</Message></Response>`;
      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Insert into database
    const { data, error } = await supabase.from("expenses").insert({
      date: parsed.date,
      category: parsed.category,
      description: parsed.description,
      vehicle: parsed.vehicle,
      amount: parsed.amount,
      status: parsed.status,
      source: "whatsapp",
    }).select().single();

    if (error) {
      console.error("DB insert error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const formattedAmount = parsed.amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });

    // Return TwiML response for Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Registrado!
📋 ${parsed.description}
🚐 ${parsed.vehicle}
💰 R$ ${formattedAmount}
📅 ${parsed.date}
📂 ${parsed.category}
🔖 ${parsed.status}</Message></Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    const errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
    
    // Return error as TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Erro ao processar: ${errorMessage}</Message></Response>`;
    return new Response(twiml, {
      status: 200, // Twilio expects 200
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});

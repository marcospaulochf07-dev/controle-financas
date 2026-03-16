import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const today = new Date().toISOString().split("T")[0];

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

Identifique a AÇÃO da mensagem:

1. **register_expense** — Quando o usuário quer REGISTRAR um novo gasto. Ex: "Troca de pneus Van 01 R$450", "Seguro R$400 pendente"
2. **mark_paid_by_description** — Quando o usuário diz que um item específico foi pago, usando a descrição. Ex: "Troca de pneus pago", "Parcela financiamento paga"
3. **mark_paid_by_category** — Quando o usuário diz que uma categoria inteira foi paga. Ex: "Contador paga", "Seguro pago", "Financiamento pago"
4. **register_daily** — Quando o usuário quer registrar diárias de motoristas. Ex: "1 diária para Valdir", "Coloque 2 diárias para João", "3 rotas para Maria", "Coloque 1 diária para Valdir"

Para register_expense, extraia:
- date: data (YYYY-MM-DD, use ${today} se não especificada)
- category: (manutencao, seguro, imposto, financiamento, salario, fgts, contador, rastreador, diaria, outros)
- description: descrição curta
- vehicle: veículo (ex: "Van 01", "Geral" se não especificado)
- amount: valor em reais (OBRIGATÓRIO, número > 0)
- status: "pago" ou "pendente" (default: "pago")

Para mark_paid_by_description, extraia:
- search_description: a descrição do item a ser marcado como pago

Para mark_paid_by_category, extraia:
- search_category: a categoria a ser marcada como paga

Para register_daily, extraia:
- driver_name: nome do motorista (OBRIGATÓRIO)
- routes: número de rotas/diárias (default: 1, mínimo 1, máximo 10)
- vehicle: veículo se mencionado (default: "Geral")

Se não parecer nenhuma dessas ações, use action "invalid".`,
          },
          { role: "user", content: messageBody },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_message",
              description: "Processa a mensagem do WhatsApp",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    enum: ["register_expense", "mark_paid_by_description", "mark_paid_by_category", "register_daily", "invalid"],
                  },
                  date: { type: "string", description: "Data YYYY-MM-DD (para register_expense)" },
                  category: {
                    type: "string",
                    enum: ["manutencao", "seguro", "imposto", "financiamento", "salario", "fgts", "contador", "rastreador", "diaria", "outros"],
                  },
                  description: { type: "string" },
                  vehicle: { type: "string" },
                  amount: { type: "number" },
                  status: { type: "string", enum: ["pago", "pendente"] },
                  search_description: { type: "string", description: "Descrição do item a marcar como pago" },
                  search_category: {
                    type: "string",
                    enum: ["manutencao", "seguro", "imposto", "financiamento", "salario", "fgts", "contador", "rastreador", "diaria", "outros"],
                    description: "Categoria a marcar como paga",
                  },
                  driver_name: { type: "string", description: "Nome do motorista (para register_daily)" },
                  routes: { type: "number", description: "Número de rotas/diárias (default 1)" },
                },
                required: ["action"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_message" } },
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
    if (!toolCall) throw new Error("AI did not return structured data");

    const parsed = JSON.parse(toolCall.function.arguments);

    // === INVALID ===
    if (parsed.action === "invalid") {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❓ Não entendi. Envie algo como:\n• "Troca de pneus Van 01 R$450"\n• "Contador paga"\n• "1 diária para Valdir"</Message></Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // === MARK PAID BY DESCRIPTION ===
    if (parsed.action === "mark_paid_by_description") {
      const search = parsed.search_description || parsed.description || "";
      const { data: items, error: qErr } = await supabase
        .from("expenses")
        .select("*")
        .eq("status", "pendente")
        .ilike("description", `%${search}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (qErr || !items || items.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Nenhum item pendente encontrado com "${search}".</Message></Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const item = items[0];
      await supabase.from("expenses").update({ status: "pago" }).eq("id", item.id);

      const amt = Number(item.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Marcado como PAGO!\n📋 ${item.description}\n💰 R$ ${amt}\n📂 ${item.category}</Message></Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // === MARK PAID BY CATEGORY ===
    if (parsed.action === "mark_paid_by_category") {
      const cat = parsed.search_category || parsed.category || "";
      const { data: items, error: qErr } = await supabase
        .from("expenses")
        .select("*")
        .eq("status", "pendente")
        .eq("category", cat)
        .order("created_at", { ascending: false })
        .limit(1);

      if (qErr || !items || items.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Nenhum item pendente na categoria "${cat}".</Message></Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const item = items[0];
      await supabase.from("expenses").update({ status: "pago" }).eq("id", item.id);

      const amt = Number(item.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Marcado como PAGO!\n📋 ${item.description}\n💰 R$ ${amt}\n📂 ${item.category}</Message></Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // === REGISTER DAILY ===
    if (parsed.action === "register_daily") {
      const driverName = parsed.driver_name || "";
      const numRoutes = Math.max(1, Math.min(10, parsed.routes || 1));
      const valuePerRoute = 45;
      const totalAmount = numRoutes * valuePerRoute;
      const vehicleName = parsed.vehicle || "Geral";

      if (!driverName.trim()) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Nome do motorista não identificado. Envie: "1 diária para [nome]"</Message></Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Check if there's already a pending diaria expense for this driver this month
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = now.getMonth() === 11
        ? `${now.getFullYear() + 1}-01-01`
        : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

      const { data: existing } = await supabase
        .from("expenses")
        .select("*")
        .eq("category", "diaria")
        .eq("status", "pendente")
        .ilike("description", `%${driverName.trim()}%`)
        .gte("date", monthStart)
        .lt("date", nextMonth)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing: add routes value
        const item = existing[0];
        const newAmount = Number(item.amount) + totalAmount;
        await supabase.from("expenses").update({ amount: newAmount }).eq("id", item.id);

        const amtStr = newAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Diária atualizada!\n👤 ${driverName}\n🛣️ +${numRoutes} rota${numRoutes > 1 ? "s" : ""} (R$ ${totalAmount.toFixed(2)})\n💰 Total acumulado: R$ ${amtStr}\n📂 Pendente</Message></Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      } else {
        // Create new pending expense
        const monthLabel = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
        const { error } = await supabase.from("expenses").insert({
          date: today,
          category: "diaria",
          description: `Diárias ${driverName.trim()} - ${monthLabel}`,
          vehicle: vehicleName,
          amount: totalAmount,
          status: "pendente",
          source: "whatsapp",
        });

        if (error) {
          console.error("DB insert error:", error);
          throw new Error(`Database error: ${error.message}`);
        }

        const amtStr = totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Diária registrada!\n👤 ${driverName}\n🛣️ ${numRoutes} rota${numRoutes > 1 ? "s" : ""}\n💰 R$ ${amtStr}\n📂 Pendente</Message></Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }
    }

    // === REGISTER EXPENSE ===
    const amount = Number(parsed.amount) || 0;
    if (amount <= 0) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Valor não identificado. Envie com o valor, ex: "Troca de pneus R$450"</Message></Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    const { data, error } = await supabase.from("expenses").insert({
      date: parsed.date || today,
      category: parsed.category || "outros",
      description: parsed.description || "",
      vehicle: parsed.vehicle || "Geral",
      amount,
      status: parsed.status || "pago",
      source: "whatsapp",
    }).select().single();

    if (error) {
      console.error("DB insert error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const formattedAmount = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Registrado!\n📋 ${parsed.description || "Sem descrição"}\n🚐 ${parsed.vehicle || "Geral"}\n💰 R$ ${formattedAmount}\n📅 ${parsed.date || today}\n📂 ${parsed.category || "outros"}\n🔖 ${parsed.status || "pago"}</Message></Response>`;
    return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });

  } catch (e) {
    console.error("Webhook error:", e);
    const errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Erro ao processar: ${errorMessage}</Message></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});

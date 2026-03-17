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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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

    const systemPrompt = `Você é um assistente de gestão de frota. Interprete mensagens de WhatsApp sobre gastos/despesas de uma empresa de transporte com vans.

Identifique a AÇÃO da mensagem e retorne APENAS um JSON válido (sem markdown, sem backticks):

1. **register_expense** — Quando o usuário quer REGISTRAR um novo gasto. Ex: "Troca de pneus Van 01 R$450", "Seguro R$400 pendente"
2. **mark_paid_by_description** — Quando o usuário diz que um item específico foi pago, usando a descrição. Ex: "Troca de pneus pago", "Parcela financiamento paga"
3. **mark_paid_by_category** — Quando o usuário diz que uma categoria inteira foi paga. Ex: "Contador paga", "Seguro pago", "Financiamento pago"
4. **register_daily** — Quando o usuário quer registrar diárias de motoristas. Ex: "1 diária para Valdir", "Coloque 2 diárias para João", "3 rotas para Maria"

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
- search_category: a categoria a ser marcada como paga (manutencao, seguro, imposto, financiamento, salario, fgts, contador, rastreador, diaria, outros)

Para register_daily, extraia:
- driver_name: nome do motorista (OBRIGATÓRIO)
- routes: número de rotas/diárias (default: 1, mínimo 1, máximo 10)
- vehicle: veículo se mencionado (default: "Geral")

Se não parecer nenhuma dessas ações, use action "invalid".

Responda SOMENTE com o JSON, exemplo: {"action":"register_expense","date":"2026-03-17","category":"manutencao","description":"Troca de pneus","vehicle":"Van 01","amount":450,"status":"pago"}`;

    const geminiRequestBody = JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nMensagem do usuário: "${messageBody}"` }] },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    let aiResponse: Response | null = null;
    let lastError = "";

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(12000),
              body: geminiRequestBody,
            }
          );

          if (resp.ok) {
            aiResponse = resp;
            break;
          }

          const errText = await resp.text();
          lastError = `${model} (${resp.status}): ${errText}`;
          console.error("Gemini API error:", lastError);

          if (resp.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded, tente novamente em instantes." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // For 503 (overloaded), wait briefly and retry
          if (resp.status === 503 && attempt === 0) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          // For other errors, try next model
          break;
        } catch (fetchErr) {
          lastError = `${model}: ${fetchErr}`;
          console.error("Fetch error:", lastError);
          break;
        }
      }
      if (aiResponse) break;
    }

    if (!aiResponse) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    const aiData = await aiResponse.json();
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error("Gemini did not return content");

    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", textContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    

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

      // 1. Insert into driver_dailies table (individual record)
      const { error: dailyErr } = await supabase.from("driver_dailies").insert({
        date: today,
        driver_name: driverName.trim(),
        routes: numRoutes,
        value_per_route: valuePerRoute,
        vehicle: vehicleName,
        source: "whatsapp",
      });

      if (dailyErr) {
        console.error("Error inserting driver_daily:", dailyErr);
      }

      // 2. Sync the consolidated expense (pending payment)
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = now.getMonth() === 11
        ? `${now.getFullYear() + 1}-01-01`
        : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

      const { data: existing } = await supabase
        .from("expenses")
        .select("*")
        .eq("category", "diaria")
        .ilike("description", `%${driverName.trim()}%`)
        .gte("date", monthStart)
        .lt("date", nextMonth)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const item = existing[0];
        const newAmount = Number(item.amount) + totalAmount;
        await supabase.from("expenses").update({ amount: newAmount }).eq("id", item.id);

        const amtStr = newAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Diária atualizada!\n👤 ${driverName}\n🛣️ +${numRoutes} rota${numRoutes > 1 ? "s" : ""} (R$ ${totalAmount.toFixed(2)})\n💰 Total acumulado: R$ ${amtStr}\n📂 Pendente</Message></Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      } else {
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

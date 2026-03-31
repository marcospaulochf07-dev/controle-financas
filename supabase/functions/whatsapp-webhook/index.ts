import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_TIMEZONE = "America/Sao_Paulo";
const CONVERSATION_TTL_MS = 15 * 60 * 1000;

type ConversationState = {
  sender: string;
  pending_action: string;
  pending_payload: Record<string, unknown>;
  expires_at: string;
};

type GeminiPayload = {
  action?: string;
  reply?: string;
  needs_follow_up?: boolean;
  pending_action?: string | null;
  pending_payload?: Record<string, unknown> | null;
  date?: string;
  month_key?: string;
  category?: string;
  description?: string;
  vehicle?: string;
  amount?: number;
  status?: "pago" | "pendente";
  search_description?: string;
  search_category?: string;
  driver_name?: string;
  routes?: number;
  routes_to_pay?: number;
  pay_all?: boolean;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function twiml(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function getDatePartsInTimeZone(date = new Date(), timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTodayInTimeZone() {
  const { year, month, day } = getDatePartsInTimeZone();
  return formatDateParts(year, month, day);
}

function getMonthBoundsFromKey(monthKey: string) {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const start = `${yearString}-${monthString}-01`;

  if (month === 12) {
    return { monthKey, start, endExclusive: `${year + 1}-01-01` };
  }

  return {
    monthKey,
    start,
    endExclusive: `${yearString}-${String(month + 1).padStart(2, "0")}-01`,
  };
}

function getCurrentMonthBounds() {
  const { year, month } = getDatePartsInTimeZone();
  return getMonthBoundsFromKey(`${year}-${String(month).padStart(2, "0")}`);
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function getConversationState(supabase: ReturnType<typeof createClient>, sender: string) {
  const { data, error } = await supabase
    .from("whatsapp_conversation_state")
    .select("*")
    .eq("sender", sender)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading conversation state:", error);
    return null;
  }

  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await clearConversationState(supabase, sender);
    return null;
  }

  return data as ConversationState;
}

async function saveConversationState(
  supabase: ReturnType<typeof createClient>,
  sender: string,
  pendingAction: string,
  pendingPayload: Record<string, unknown>,
) {
  const expiresAt = new Date(Date.now() + CONVERSATION_TTL_MS).toISOString();
  const { error } = await supabase.from("whatsapp_conversation_state").upsert(
    {
      sender,
      pending_action: pendingAction,
      pending_payload: pendingPayload,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "sender" },
  );

  if (error) {
    console.error("Error saving conversation state:", error);
  }
}

async function clearConversationState(supabase: ReturnType<typeof createClient>, sender: string) {
  const { error } = await supabase.from("whatsapp_conversation_state").delete().eq("sender", sender);
  if (error) {
    console.error("Error clearing conversation state:", error);
  }
}

function buildPrompt(today: string, pendingState: ConversationState | null, messageBody: string) {
  return `Você é um assistente de gestão financeira de frota via WhatsApp. Entenda português do Brasil coloquial e responda SOMENTE com JSON válido.

Data de hoje em ${APP_TIMEZONE}: ${today}
Contexto pendente atual: ${JSON.stringify(pendingState ? {
    pending_action: pendingState.pending_action,
    pending_payload: pendingState.pending_payload,
  } : null)}

Formato obrigatório de resposta:
{
  "action": "chat|register_expense|mark_paid_by_description|mark_paid_by_category|register_daily|pay_daily_routes",
  "reply": "texto em pt-BR para responder ao usuário quando action=chat ou quando precisar perguntar algo",
  "needs_follow_up": false,
  "pending_action": null,
  "pending_payload": null,
  "date": "YYYY-MM-DD",
  "month_key": "YYYY-MM",
  "category": "manutencao|seguro|imposto|financiamento|salario|fgts|contador|rastreador|outros",
  "description": "descrição curta",
  "vehicle": "Van 01|Geral|...",
  "amount": 0,
  "status": "pago|pendente",
  "search_description": "",
  "search_category": "manutencao|seguro|imposto|financiamento|salario|fgts|contador|rastreador|outros",
  "driver_name": "",
  "routes": 1,
  "routes_to_pay": 1,
  "pay_all": false
}

Regras:
- Use "chat" para conversa natural, cumprimento, agradecimento, dúvida geral ou qualquer mensagem fora do fluxo financeiro.
- Se a pessoa quiser executar uma ação mas faltar dado, use action "chat", needs_follow_up=true, pending_action com a ação real, pending_payload com o que já foi entendido e reply perguntando só o que falta.
- Se existir contexto pendente, combine a mensagem atual com esse contexto para concluir a ação quando possível.
- Nunca use category "diaria" em register_expense. Diárias devem usar register_daily e pagamentos de diária devem usar pay_daily_routes.
- Para register_daily, use routes padrão 1, vehicle padrão "Geral" e date padrão ${today}.
- Para pay_daily_routes, use month_key padrão do mês atual se não for mencionado. Se a pessoa disser "tudo", marque pay_all=true.
- Para mensagens informais ou abertas, responda de forma curta, útil e amigável em reply, sem inventar dados financeiros.
- Não use markdown, não use crases, não explique o JSON.

Mensagem do usuário: "${messageBody}"`;
}

async function callGemini(prompt: string, apiKey: string) {
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  const timeouts = [10000, 4000];
  let response: Response | null = null;
  let lastError = "";

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(timeouts[index]),
          body: requestBody,
        },
      );

      if (geminiResponse.ok) {
        response = geminiResponse;
        break;
      }

      lastError = `${model} (${geminiResponse.status}): ${await geminiResponse.text()}`;
      console.error("Gemini API error:", lastError);

      if (geminiResponse.status === 429) {
        throw new Error("Rate limit exceeded, tente novamente em instantes.");
      }
    } catch (error) {
      lastError = `${model}: ${error}`;
      console.error("Gemini fetch error:", lastError);
    }
  }

  if (!response) {
    throw new Error(`All Gemini models failed. Last error: ${lastError}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini did not return content");

  try {
    return JSON.parse(text) as GeminiPayload;
  } catch (error) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
}

async function ensureDriverExists(supabase: ReturnType<typeof createClient>, driverName: string) {
  const normalized = normalizeText(driverName);
  if (!normalized) return;

  const { error } = await supabase.from("drivers").upsert(
    {
      name: normalized,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );

  if (error) {
    console.error("Error ensuring driver exists:", error);
  }
}

async function ensureVehicleExists(supabase: ReturnType<typeof createClient>, vehicleId: string) {
  const normalized = normalizeText(vehicleId || "Geral");
  if (!normalized) return;

  const { error } = await supabase.from("vehicles").upsert(
    {
      id: normalized,
      display_name: normalized,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Error ensuring vehicle exists:", error);
  }
}

async function getDriverOutstandingAmount(
  supabase: ReturnType<typeof createClient>,
  driverName: string,
  monthStart: string,
  monthEnd: string,
) {
  const { data, error } = await supabase
    .from("driver_dailies")
    .select("routes, paid_routes, value_per_route")
    .eq("driver_name", driverName)
    .gte("date", monthStart)
    .lt("date", monthEnd);

  if (error || !data) {
    console.error("Error loading driver outstanding amount:", error);
    return 0;
  }

  return data.reduce((sum, row) => {
    const unpaidRoutes = Math.max(Number(row.routes) - Number(row.paid_routes || 0), 0);
    return sum + unpaidRoutes * Number(row.value_per_route || 0);
  }, 0);
}

async function payDriverRoutes(
  supabase: ReturnType<typeof createClient>,
  driverName: string,
  routesToPay: number,
  monthStart: string,
  monthEnd: string,
) {
  const { data, error } = await supabase
    .from("driver_dailies")
    .select("id, date, created_at, routes, paid_routes, value_per_route")
    .eq("driver_name", driverName)
    .gte("date", monthStart)
    .lt("date", monthEnd)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao carregar diárias de ${driverName}: ${error.message}`);
  }

  const openRows = (data || []).filter((row) => Number(row.routes) > Number(row.paid_routes || 0));
  if (openRows.length === 0) {
    return { paidRoutes: 0, remainingDebt: 0 };
  }

  let remaining = routesToPay;
  let paidRoutes = 0;

  for (const row of openRows) {
    if (remaining <= 0) break;

    const currentPaid = Number(row.paid_routes || 0);
    const routes = Number(row.routes || 0);
    const available = Math.max(routes - currentPaid, 0);
    const allocating = Math.min(available, remaining);

    if (allocating <= 0) continue;

    const { error: updateError } = await supabase
      .from("driver_dailies")
      .update({ paid_routes: currentPaid + allocating })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar rotas pagas: ${updateError.message}`);
    }

    paidRoutes += allocating;
    remaining -= allocating;
  }

  const remainingDebt = await getDriverOutstandingAmount(supabase, driverName, monthStart, monthEnd);
  return { paidRoutes, remainingDebt };
}

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
    const contentType = req.headers.get("content-type") || "";
    let messageBody = "";
    let senderNumber = "";

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
      return new Response(JSON.stringify({ error: "Mensagem vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = getTodayInTimeZone();
    const pendingState = await getConversationState(supabase, senderNumber || "manual");
    const parsed = await callGemini(buildPrompt(today, pendingState, messageBody), GEMINI_API_KEY);

    if (parsed.action === "chat" || parsed.needs_follow_up) {
      if (parsed.needs_follow_up && parsed.pending_action) {
        await saveConversationState(
          supabase,
          senderNumber || "manual",
          parsed.pending_action,
          parsed.pending_payload || {},
        );
      } else {
        await clearConversationState(supabase, senderNumber || "manual");
      }

      return new Response(twiml(parsed.reply || "Posso te ajudar com lançamentos, diárias, pagamentos ou dúvidas rápidas da operação."), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    const monthBounds = getMonthBoundsFromKey(parsed.month_key || getCurrentMonthBounds().monthKey);

    if (parsed.action === "mark_paid_by_description") {
      const search = normalizeText(parsed.search_description || parsed.description || "");
      if (!search) {
        await saveConversationState(supabase, senderNumber || "manual", "mark_paid_by_description", {});
        return new Response(twiml("Qual é a descrição do item que você quer marcar como pago?"), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      const { data: items, error } = await supabase
        .from("expenses")
        .select("*")
        .neq("category", "diaria")
        .eq("status", "pendente")
        .ilike("description", `%${search}%`)
        .gte("date", monthBounds.start)
        .lt("date", monthBounds.endExclusive)
        .order("date", { ascending: true })
        .limit(1);

      if (error || !items || items.length === 0) {
        return new Response(twiml(`Não encontrei item pendente com "${search}" nesse mês.`), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      await supabase.from("expenses").update({ status: "pago" }).eq("id", items[0].id);
      await clearConversationState(supabase, senderNumber || "manual");

      const amount = Number(items[0].amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      return new Response(twiml(`Pagamento confirmado.\n${items[0].description}\nR$ ${amount}`), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    if (parsed.action === "mark_paid_by_category") {
      const category = normalizeText(parsed.search_category || parsed.category || "");
      if (!category) {
        await saveConversationState(supabase, senderNumber || "manual", "mark_paid_by_category", {});
        return new Response(twiml("Qual categoria você quer marcar como paga?"), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      const { data: items, error } = await supabase
        .from("expenses")
        .select("*")
        .neq("category", "diaria")
        .eq("status", "pendente")
        .eq("category", category)
        .gte("date", monthBounds.start)
        .lt("date", monthBounds.endExclusive)
        .order("date", { ascending: true })
        .limit(1);

      if (error || !items || items.length === 0) {
        return new Response(twiml(`Não encontrei item pendente na categoria "${category}" nesse mês.`), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      await supabase.from("expenses").update({ status: "pago" }).eq("id", items[0].id);
      await clearConversationState(supabase, senderNumber || "manual");

      const amount = Number(items[0].amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      return new Response(twiml(`Categoria quitada.\n${items[0].description}\nR$ ${amount}`), {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    if (parsed.action === "register_daily") {
      const driverName = normalizeText(parsed.driver_name || "");
      const routes = Math.max(1, Math.min(10, Number(parsed.routes || 1)));
      const vehicle = normalizeText(parsed.vehicle || "Geral") || "Geral";
      const date = parsed.date || today;

      if (!driverName) {
        await saveConversationState(supabase, senderNumber || "manual", "register_daily", {
          routes,
          vehicle,
          date,
        });
        return new Response(twiml("Para qual motorista eu devo lançar essa diária?"), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      await Promise.all([ensureDriverExists(supabase, driverName), ensureVehicleExists(supabase, vehicle)]);

      const { error } = await supabase.from("driver_dailies").insert({
        date,
        driver_name: driverName,
        routes,
        paid_routes: 0,
        value_per_route: 45,
        vehicle,
        source: "whatsapp",
      });

      if (error) {
        throw new Error(`Erro ao salvar diária: ${error.message}`);
      }

      const monthKey = parsed.month_key || date.slice(0, 7);
      const bounds = getMonthBoundsFromKey(monthKey);
      const remainingDebt = await getDriverOutstandingAmount(supabase, driverName, bounds.start, bounds.endExclusive);

      await clearConversationState(supabase, senderNumber || "manual");
      return new Response(
        twiml(`Diária registrada.\nMotorista: ${driverName}\nRotas: ${routes}\nValor: R$ ${(routes * 45).toFixed(2)}\nSaldo em aberto no mês: R$ ${remainingDebt.toFixed(2)}`),
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } },
      );
    }

    if (parsed.action === "pay_daily_routes") {
      const driverName = normalizeText(parsed.driver_name || "");
      const selectedBounds = getMonthBoundsFromKey(parsed.month_key || getCurrentMonthBounds().monthKey);
      const routesToPay = parsed.pay_all ? Number.MAX_SAFE_INTEGER : Math.max(1, Number(parsed.routes_to_pay || 0));

      if (!driverName) {
        await saveConversationState(supabase, senderNumber || "manual", "pay_daily_routes", {
          month_key: selectedBounds.monthKey,
          routes_to_pay: parsed.pay_all ? null : routesToPay,
          pay_all: Boolean(parsed.pay_all),
        });
        return new Response(twiml("De qual motorista eu devo baixar essas rotas?"), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      if (!parsed.pay_all && routesToPay <= 0) {
        await saveConversationState(supabase, senderNumber || "manual", "pay_daily_routes", {
          driver_name: driverName,
          month_key: selectedBounds.monthKey,
        });
        return new Response(twiml("Quantas rotas você quer marcar como pagas?"), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      const payment = await payDriverRoutes(
        supabase,
        driverName,
        routesToPay,
        selectedBounds.start,
        selectedBounds.endExclusive,
      );

      await clearConversationState(supabase, senderNumber || "manual");

      if (payment.paidRoutes === 0) {
        return new Response(twiml(`Não encontrei rotas em aberto para ${driverName} nesse mês.`), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      return new Response(
        twiml(`Pagamento parcial registrado.\nMotorista: ${driverName}\nRotas baixadas: ${payment.paidRoutes}\nSaldo em aberto: R$ ${payment.remainingDebt.toFixed(2)}`),
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } },
      );
    }

    if (parsed.action === "register_expense") {
      const amount = Number(parsed.amount) || 0;
      const category = normalizeText(parsed.category || "outros");
      const description = normalizeText(parsed.description || "");
      const vehicle = normalizeText(parsed.vehicle || "Geral") || "Geral";
      const status = parsed.status || "pago";
      const date = parsed.date || today;

      if (category === "diaria") {
        await saveConversationState(supabase, senderNumber || "manual", "register_daily", {
          vehicle,
          date,
        });
        return new Response(twiml("Para diária eu preciso do motorista e da quantidade de rotas. Me diga algo como: 2 rotas para João."), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      if (amount <= 0) {
        await saveConversationState(supabase, senderNumber || "manual", "register_expense", {
          category,
          description,
          vehicle,
          status,
          date,
        });
        return new Response(twiml("Qual é o valor desse gasto?"), {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      await ensureVehicleExists(supabase, vehicle);
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          date,
          category,
          description,
          vehicle,
          amount,
          status,
          source: "whatsapp",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao salvar gasto: ${error.message}`);
      }

      await clearConversationState(supabase, senderNumber || "manual");

      const formattedAmount = Number(data.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      return new Response(
        twiml(`Lançamento registrado.\n${data.description || "Sem descrição"}\n${data.vehicle}\nR$ ${formattedAmount}\n${data.status}`),
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } },
      );
    }

    await clearConversationState(supabase, senderNumber || "manual");
    return new Response(twiml(parsed.reply || "Posso conversar normalmente e também registrar gastos, diárias e pagamentos."), {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(twiml(`Erro ao processar: ${errorMessage}`), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});

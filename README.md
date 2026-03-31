# Gestor de Frota

Aplicação web para controle financeiro operacional de frota, com foco em:

- lançamentos de despesas
- custos fixos recorrentes
- diárias de motoristas com pagamento parcial por rota
- receita mensal e margem líquida
- visão de pagamentos pendentes e realizados
- integração por WhatsApp via Supabase Edge Function

O projeto foi iniciado no Lovable, mas hoje a lógica principal já está organizada no repositório e integrada ao Supabase.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase
- Recharts
- Framer Motion
- Vitest

## Principais fluxos

### Despesas

- despesas manuais ficam na tabela `expenses`
- despesas de categoria `diaria` antigas são preservadas, mas o cálculo atual de diárias usa `driver_dailies` como fonte de verdade

### Diárias

- cada diária é registrada em `driver_dailies`
- `paid_routes` controla quantas rotas daquele lançamento já foram pagas
- o app deriva custo total, total pago e saldo devedor a partir desses registros

### Recorrentes

- os modelos ficam em `recurring_templates`
- as ocorrências mensais são materializadas em `expenses` com `source = 'recorrente-auto'`
- o card de recorrentes sempre opera no mês selecionado na interface

### Receita

- a receita mensal fica em `monthly_revenues`
- se um mês ainda não tiver valor salvo, o app usa fallback de `R$ 20.000,00`

### WhatsApp

- a function `whatsapp-webhook` interpreta mensagens livres
- ela consegue conversar, lançar gasto, registrar diária e baixar rotas pagas
- o contexto curto da conversa fica em `whatsapp_conversation_state`

## Estrutura importante

- `src/pages/Index.tsx`: composição principal do dashboard
- `src/lib/store.ts`: acesso a dados no Supabase e migração best-effort do legado local
- `src/lib/driver-daily-expenses.ts`: agregações financeiras de diárias
- `src/lib/date-utils.ts`: utilitários de data em `America/Sao_Paulo`
- `supabase/migrations/`: schema do banco
- `supabase/functions/whatsapp-webhook/`: integração por WhatsApp

## Rodando localmente

Pré-requisitos:

- Node.js 18+
- npm

Instalação:

```sh
npm install
```

Desenvolvimento:

```sh
npm run dev
```

Testes:

```sh
npm test
```

Lint:

```sh
npm run lint
```

Build:

```sh
npm run build
```

## Variáveis de ambiente

O app espera estas variáveis no `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

## Banco e functions

Depois de mudar schema ou webhook, lembre de aplicar no projeto Supabase real:

1. rodar as migrations novas
2. publicar a Edge Function `whatsapp-webhook`

Arquivos mais importantes deste ciclo:

- `supabase/migrations/20260331133000_supabase_first_finance_refactor.sql`
- `supabase/functions/whatsapp-webhook/index.ts`

## Observações de produto

- a timezone oficial do app é `America/Sao_Paulo`
- o cálculo de diárias não deve duplicar custo com registros antigos em `expenses`
- parte do legado pode existir em `localStorage`, mas hoje ele é usado apenas como ponte de migração para o Supabase

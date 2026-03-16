

## Plano de Implementação

O pedido tem 3 partes principais:

### 1. WhatsApp: Marcar itens como "pago" via mensagem

Atualizar a Edge Function `whatsapp-webhook` para suportar dois novos comandos além de registrar gastos:

- **"Descrição pago/paga"** (ex: "Troca de pneus pago") → busca o item pendente com essa descrição e marca como `pago`
- **"Categoria paga"** (ex: "Contador paga") → busca o último item pendente daquela categoria e marca como `pago`

O prompt de IA será expandido para identificar 3 tipos de ação: `register_expense`, `mark_paid_by_description`, `mark_paid_by_category`. O sistema fará uma query no banco para encontrar o item correspondente e atualizar o status.

### 2. Itens Recorrentes Mensais Pré-Cadastrados

Adicionar os seguintes itens fixos como recorrentes padrão (via seed no componente `RecurringReminders` ou como dados iniciais):

| Item | Valor | Categoria |
|------|-------|-----------|
| Contador | R$ 810,00 | contador |
| Imposto da Nota (6%) | R$ 1.250,00 | imposto |
| Parcela Financiamento | R$ 4.500,00 | financiamento |
| Seguro | R$ 400,00 | seguro |
| Férias e 13º | R$ 400,00 | salario |
| Diárias dos Motoristas | calculado | diaria |

As diárias dos motoristas serão calculadas automaticamente a partir dos lançamentos existentes (DriverDailies). Os demais serão adicionados como lembretes recorrentes padrão se a lista estiver vazia.

### 3. Gráficos Comparativos Mês a Mês e por Categoria

Melhorar a aba "Comparativo" e "Gráficos":

- **Gráfico de barras mês a mês**: Mostrar os últimos 6 meses lado a lado (receita vs custo) no componente `MonthComparison`
- **Gráfico por categoria**: Adicionar um gráfico de barras agrupadas comparando gastos por categoria entre o mês atual e o anterior
- Usar Recharts (já instalado) para os novos gráficos visuais na aba Comparativo

### Arquivos Modificados

- `supabase/functions/whatsapp-webhook/index.ts` — Adicionar lógica de "marcar como pago"
- `src/components/RecurringReminders.tsx` — Seed de itens fixos mensais
- `src/components/MonthComparison.tsx` — Adicionar gráficos de barras comparativos
- `src/components/DriverDailies.tsx` — Expor cálculo de diárias para uso nos recorrentes


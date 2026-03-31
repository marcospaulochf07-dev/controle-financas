import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setMonthlyRevenue } from "@/lib/store";
import { Check, Pencil, X } from "lucide-react";

interface Props {
  month: string;
  currentValue: number;
  onUpdated: () => void;
}

export function RevenueEditor({ month, currentValue, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue.toString());

  const cancel = () => {
    setValue(currentValue.toString());
    setEditing(false);
  };

  const save = async () => {
    const num = parseFloat(value.replace(",", "."));
    if (!isNaN(num)) {
      await setMonthlyRevenue(month, num);
      onUpdated();
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <Button
        onClick={() => { setValue(currentValue.toString()); setEditing(true); }}
        variant="outline"
        size="sm"
        className="h-8 rounded-lg border-border/70 bg-background/80 px-3 text-[11px] font-semibold text-foreground/80 shadow-sm hover:bg-accent/80 hover:text-foreground"
        aria-label="Editar receita do mês"
      >
        <Pencil className="h-3 w-3" />
        Editar receita do mês
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/90 p-2 shadow-sm">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-36 border-border/70 bg-card text-sm font-semibold tabular-nums"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && void save()}
        aria-label="Novo valor da receita"
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-profit hover:bg-profit/10 hover:text-profit" onClick={() => void save()} aria-label="Salvar receita">
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-foreground/60 hover:bg-accent hover:text-foreground" onClick={cancel} aria-label="Cancelar edição da receita">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

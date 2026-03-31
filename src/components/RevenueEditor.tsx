import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setMonthlyRevenue } from "@/lib/store";
import { Check, Pencil } from "lucide-react";

interface Props {
  month: string;
  currentValue: number;
  onUpdated: () => void;
}

export function RevenueEditor({ month, currentValue, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue.toString());

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
      <button
        onClick={() => { setValue(currentValue.toString()); setEditing(true); }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="h-3 w-3" />
        Editar receita
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-32 text-xs tabular-nums"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && void save()}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void save()}>
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

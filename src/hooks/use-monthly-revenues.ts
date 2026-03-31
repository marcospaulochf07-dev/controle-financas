import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMonthlyRevenues } from "@/lib/store";
import { MonthlyRevenue } from "@/lib/types";

export function useMonthlyRevenues() {
  const [revenues, setRevenues] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getMonthlyRevenues();
    setRevenues(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("monthly-revenues-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_revenues" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { revenues, loading, refresh };
}

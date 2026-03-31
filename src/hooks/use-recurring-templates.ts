import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRecurringTemplatesAsync } from "@/lib/store";
import { RecurringTemplate } from "@/lib/types";
import { createRealtimeChannelName } from "@/lib/realtime";

export function useRecurringTemplates() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getRecurringTemplatesAsync();
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel(createRealtimeChannelName("recurring-templates-changes"))
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_templates" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { templates, loading, refresh };
}

import { useState, useEffect, useCallback } from "react";
import { getDriverDailiesAsync } from "@/lib/store";
import { DriverDaily } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannelName } from "@/lib/realtime";

export function useDriverDailies() {
  const [dailies, setDailies] = useState<DriverDaily[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getDriverDailiesAsync();
    setDailies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel(createRealtimeChannelName("driver-dailies-changes"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_dailies" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { dailies, loading, refresh };
}

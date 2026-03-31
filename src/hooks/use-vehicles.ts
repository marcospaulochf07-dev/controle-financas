import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVehiclesAsync } from "@/lib/store";
import { Vehicle } from "@/lib/types";
import { createRealtimeChannelName } from "@/lib/realtime";

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getVehiclesAsync();
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel(createRealtimeChannelName("vehicles-changes"))
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { vehicles, loading, refresh };
}

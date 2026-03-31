import { useEffect, useState } from "react";
import { initializeSupabaseData } from "@/lib/store";

export function useAppBootstrap(onReady?: () => void) {
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setBootstrapping(true);
      await initializeSupabaseData();

      if (!cancelled) {
        onReady?.();
        setBootstrapping(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [onReady]);

  return { bootstrapping };
}

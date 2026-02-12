import { useInterval } from "@/hooks/useInterval";
import { useMemo, useState } from "react";

export function useNow(tickMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useInterval(() => setNow(Date.now()), tickMs);
  return useMemo(() => now, [now]);
}

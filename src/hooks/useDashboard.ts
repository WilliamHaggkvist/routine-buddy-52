import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/app.functions";
import { todayKey, weekdayOf } from "@/lib/day";

export function useDashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const day = todayKey();
  const weekday = weekdayOf();

  const query = useQuery({
    queryKey: ["dashboard", day],
    queryFn: () => fetchDashboard({ data: { day, weekday } }),
    staleTime: 10_000,
  });

  return { ...query, day, weekday };
}

export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

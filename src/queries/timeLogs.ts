import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TimeLogRow } from "@/lib/database.types";

const KEY = ["time_logs"] as const;

export function useTimeLogs(filter?: {
  memberId?: string;
  projectId?: string;
  taskId?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: [...KEY, filter ?? {}],
    queryFn: async (): Promise<TimeLogRow[]> => {
      let q = supabase
        .from("time_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (filter?.memberId) q = q.eq("member_id", filter.memberId);
      if (filter?.projectId) q = q.eq("project_id", filter.projectId);
      if (filter?.taskId) q = q.eq("task_id", filter.taskId);
      if (filter?.from) q = q.gte("log_date", filter.from);
      if (filter?.to) q = q.lte("log_date", filter.to);
      const { data, error } = await q.returns<TimeLogRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface TimeLogInput {
  member_id: string;
  project_id: string;
  task_id?: string | null;
  log_date: string;
  hours: number;
  description?: string | null;
  is_billable?: boolean;
}

export function useCreateTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimeLogInput): Promise<TimeLogRow> => {
      const { data, error } = await supabase
        .from("time_logs")
        .insert(input)
        .select("*")
        .single<TimeLogRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("time_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

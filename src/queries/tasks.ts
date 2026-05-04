import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  TaskCommentRow,
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "@/lib/database.types";

const KEY = ["tasks"] as const;

export function useTasks(filter?: {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
}) {
  return useQuery({
    queryKey: [...KEY, filter ?? {}],
    queryFn: async (): Promise<TaskRow[]> => {
      let q = supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (filter?.projectId) q = q.eq("project_id", filter.projectId);
      if (filter?.assigneeId) q = q.eq("assignee_id", filter.assigneeId);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q.returns<TaskRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface TaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  is_visible_to_client?: boolean;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput): Promise<TaskRow> => {
      const { data: auth } = await supabase.auth.getUser();
      // Place new tasks at end of their column.
      const { data: maxRows } = await supabase
        .from("tasks")
        .select("position")
        .eq("project_id", input.project_id)
        .eq("status", input.status ?? "todo")
        .order("position", { ascending: false })
        .limit(1)
        .returns<Pick<TaskRow, "position">[]>();
      const nextPos = (maxRows?.[0]?.position ?? 0) + 10;
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...input,
          position: nextPos,
          created_by: auth.user?.id ?? null,
        })
        .select("*")
        .single<TaskRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<TaskInput> & { position?: number };
    }): Promise<TaskRow> => {
      const fullPatch: Partial<TaskRow> = { ...patch };
      if (patch.status === "done") {
        fullPatch.completed_at = new Date().toISOString();
      } else if (patch.status) {
        fullPatch.completed_at = null;
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(fullPatch)
        .eq("id", id)
        .select("*")
        .single<TaskRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      position,
    }: {
      id: string;
      status: TaskStatus;
      position: number;
    }): Promise<TaskRow> => {
      const patch: Partial<TaskRow> = { status, position };
      if (status === "done") {
        patch.completed_at = new Date().toISOString();
      } else {
        patch.completed_at = null;
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single<TaskRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

// ---- Task comments ----------------------------------------------------

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskCommentRow[]> => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true })
        .returns<TaskCommentRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      body,
      isVisibleToClient,
    }: {
      taskId: string;
      body: string;
      isVisibleToClient: boolean;
    }): Promise<TaskCommentRow> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          author_id: auth.user?.id ?? null,
          body,
          is_visible_to_client: isVisibleToClient,
        })
        .select("*")
        .single<TaskCommentRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["task_comments", vars.taskId] });
    },
  });
}

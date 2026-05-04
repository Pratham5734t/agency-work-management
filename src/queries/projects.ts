import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  ProjectKind,
  ProjectMemberRow,
  ProjectRow,
  ProjectStatus,
} from "@/lib/database.types";

const KEY = ["projects"] as const;

export function useProjects(filter?: {
  clientId?: string;
  status?: ProjectStatus;
}) {
  return useQuery({
    queryKey: [...KEY, filter ?? {}],
    queryFn: async (): Promise<ProjectRow[]> => {
      let q = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter?.clientId) q = q.eq("client_id", filter.clientId);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q.returns<ProjectRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "byId", id],
    enabled: !!id,
    queryFn: async (): Promise<ProjectRow | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .maybeSingle<ProjectRow>();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export interface ProjectInput {
  client_id: string;
  name: string;
  kind: ProjectKind;
  status?: ProjectStatus;
  description?: string | null;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  manager_id?: string | null;
  is_visible_to_client?: boolean;
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<ProjectRow> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("*")
        .single<ProjectRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<ProjectInput>;
    }): Promise<ProjectRow> => {
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single<ProjectRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: [...KEY, "byId", row.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

// ---- Project members ----------------------------------------------------

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_members", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectMemberRow[]> => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId!)
        .returns<ProjectMemberRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetProjectMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      profileIds,
    }: {
      projectId: string;
      profileIds: string[];
    }): Promise<void> => {
      const { error: delErr } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId);
      if (delErr) throw delErr;
      if (profileIds.length === 0) return;
      const rows = profileIds.map((profile_id) => ({
        project_id: projectId,
        profile_id,
      }));
      const { error: insErr } = await supabase
        .from("project_members")
        .insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({
        queryKey: ["project_members", vars.projectId],
      });
    },
  });
}

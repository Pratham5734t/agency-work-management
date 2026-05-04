import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MemberRole, ProfileRow } from "@/lib/database.types";

const KEY = ["team"] as const;

export function useTeam(opts?: { excludeClients?: boolean }) {
  return useQuery({
    queryKey: [...KEY, opts?.excludeClients ?? true],
    queryFn: async (): Promise<ProfileRow[]> => {
      let q = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (opts?.excludeClients !== false) {
        q = q.neq("role", "client");
      }
      const { data, error } = await q.returns<ProfileRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfileMap() {
  const team = useTeam({ excludeClients: false });
  const map = new Map<string, ProfileRow>();
  for (const p of team.data ?? []) map.set(p.id, p);
  return { ...team, map };
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      role,
      clientId,
    }: {
      id: string;
      role: MemberRole;
      clientId?: string | null;
    }): Promise<ProfileRow> => {
      const patch: Partial<ProfileRow> = { role };
      if (role === "client") patch.client_id = clientId ?? null;
      else patch.client_id = null;
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single<ProfileRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateOwnProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<Pick<ProfileRow, "full_name" | "job_title" | "avatar_url">>,
    ): Promise<ProfileRow> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", auth.user.id)
        .select("*")
        .single<ProfileRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

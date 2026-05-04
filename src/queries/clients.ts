import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ClientRow } from "@/lib/database.types";

const KEY = ["clients"] as const;

export function useClients(opts?: { onlyActive?: boolean }) {
  return useQuery({
    queryKey: [...KEY, opts?.onlyActive ?? false],
    queryFn: async (): Promise<ClientRow[]> => {
      let q = supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (opts?.onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q.returns<ClientRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "byId", id],
    enabled: !!id,
    queryFn: async (): Promise<ClientRow | null> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .maybeSingle<ClientRow>();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export interface ClientInput {
  name: string;
  industry?: string | null;
  website?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  monthly_retainer?: number | null;
  is_active?: boolean;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientInput): Promise<ClientRow> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("*")
        .single<ClientRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<ClientInput>;
    }): Promise<ClientRow> => {
      const { data, error } = await supabase
        .from("clients")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single<ClientRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

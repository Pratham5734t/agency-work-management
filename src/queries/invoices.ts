import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  InvoiceItemRow,
  InvoiceRow,
  InvoiceStatus,
} from "@/lib/database.types";

const KEY = ["invoices"] as const;

export function useInvoices(filter?: {
  clientId?: string;
  status?: InvoiceStatus;
}) {
  return useQuery({
    queryKey: [...KEY, filter ?? {}],
    queryFn: async (): Promise<InvoiceRow[]> => {
      let q = supabase
        .from("invoices")
        .select("*")
        .order("issue_date", { ascending: false });
      if (filter?.clientId) q = q.eq("client_id", filter.clientId);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q.returns<InvoiceRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "byId", id],
    enabled: !!id,
    queryFn: async (): Promise<InvoiceRow | null> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id!)
        .maybeSingle<InvoiceRow>();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useInvoiceItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice_items", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<InvoiceItemRow[]> => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("position", { ascending: true })
        .returns<InvoiceItemRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceCreateInput {
  client_id: string;
  project_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  tax_rate: number;
  notes?: string | null;
  lines: InvoiceLineInput[];
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvoiceCreateInput): Promise<InvoiceRow> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: numberRows, error: numErr } =
        await supabase.rpc("next_invoice_number");
      if (numErr) throw numErr;
      const number = numberRows as unknown as string;

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          number,
          client_id: input.client_id,
          project_id: input.project_id ?? null,
          issue_date: input.issue_date,
          due_date: input.due_date ?? null,
          tax_rate: input.tax_rate,
          notes: input.notes ?? null,
          created_by: auth.user?.id ?? null,
        })
        .select("*")
        .single<InvoiceRow>();
      if (invErr) throw invErr;

      const itemsPayload = input.lines.map((l, i) => ({
        invoice_id: invoice.id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        amount: Math.round(l.quantity * l.unit_price * 100) / 100,
        position: i,
      }));
      if (itemsPayload.length > 0) {
        const { error: itemsErr } = await supabase
          .from("invoice_items")
          .insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }
      const { error: rpcErr } = await supabase.rpc(
        "recompute_invoice_totals",
        { p_invoice_id: invoice.id },
      );
      if (rpcErr) throw rpcErr;

      const { data: refreshed, error: refErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice.id)
        .single<InvoiceRow>();
      if (refErr) throw refErr;
      return refreshed;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: InvoiceStatus;
    }): Promise<InvoiceRow> => {
      const patch: Partial<InvoiceRow> = { status };
      if (status === "paid") patch.paid_at = new Date().toISOString();
      if (status !== "paid") patch.paid_at = null;
      const { data, error } = await supabase
        .from("invoices")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single<InvoiceRow>();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: [...KEY, "byId", row.id] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

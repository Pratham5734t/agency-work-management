import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateInvoice,
  useInvoices,
  type InvoiceLineInput,
} from "@/queries/invoices";
import { useClients } from "@/queries/clients";
import { useProjects } from "@/queries/projects";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatINR } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/database.types";

export function InvoicesPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const invoices = useInvoices();
  const clients = useClients();
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [open, setOpen] = useState(false);

  const clientById = useMemo(
    () => new Map((clients.data ?? []).map((c) => [c.id, c])),
    [clients.data],
  );

  if (invoices.isLoading || clients.isLoading) return <PageSpinner />;

  const filtered = (invoices.data ?? []).filter((i) =>
    filter === "all" ? true : i.status === filter,
  );

  const totals = (invoices.data ?? []).reduce(
    (acc, i) => {
      acc.all += Number(i.total);
      if (i.status === "paid") acc.paid += Number(i.total);
      else if (i.status === "sent" || i.status === "overdue")
        acc.outstanding += Number(i.total);
      return acc;
    },
    { all: 0, paid: 0, outstanding: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Bill clients for retainers, projects, and hours."
        actions={
          canManage ? (
            <Button
              onClick={() => setOpen(true)}
              disabled={(clients.data ?? []).length === 0}
            >
              + New invoice
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Billed" value={formatINR(totals.all)} />
        <SummaryCard label="Outstanding" value={formatINR(totals.outstanding)} />
        <SummaryCard label="Paid" value={formatINR(totals.paid)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...INVOICE_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              filter === s
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            }
          >
            {s === "all" ? "All" : INVOICE_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={(invoices.data ?? []).length === 0 ? "No invoices yet" : "No invoices match"}
          action={
            canManage && (clients.data ?? []).length > 0 ? (
              <Button onClick={() => setOpen(true)}>New invoice</Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <ul className="divide-y divide-slate-100">
              {filtered.map((inv) => {
                const client = clientById.get(inv.client_id);
                return (
                  <li key={inv.id}>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {inv.number}
                        </div>
                        <div className="text-xs text-slate-500">
                          {client?.name ?? "—"} · Issued{" "}
                          {formatDateShort(inv.issue_date)}
                          {inv.due_date
                            ? ` · Due ${formatDateShort(inv.due_date)}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-800">
                          {formatINR(inv.total)}
                        </span>
                        <Badge tone={INVOICE_STATUS_TONE[inv.status]}>
                          {INVOICE_STATUS_LABEL[inv.status]}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {canManage && open ? (
        <NewInvoiceModal onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {value}
        </div>
      </CardBody>
    </Card>
  );
}

function NewInvoiceModal({ onClose }: { onClose: () => void }) {
  const create = useCreateInvoice();
  const clients = useClients({ onlyActive: true });
  const [clientId, setClientId] = useState("");
  const projects = useProjects(clientId ? { clientId } : undefined);
  const [projectId, setProjectId] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState<string>("18");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLineInput[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const toast = useToast();

  const subtotal = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
    0,
  );
  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + taxAmount;

  const updateLine = (i: number, patch: Partial<InvoiceLineInput>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onSave = async () => {
    if (!clientId) return;
    const valid = lines.filter(
      (l) =>
        l.description.trim() && Number(l.quantity) > 0 && Number(l.unit_price) >= 0,
    );
    if (valid.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    try {
      const inv = await create.mutateAsync({
        client_id: clientId,
        project_id: projectId || null,
        issue_date: issueDate,
        due_date: dueDate || null,
        tax_rate: Number(taxRate) || 0,
        notes: notes.trim() || null,
        lines: valid.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        })),
      });
      toast.success(`Invoice ${inv.number} created`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New invoice"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            loading={create.isPending}
            disabled={!clientId}
          >
            Create draft
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Client</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId("");
              }}
            >
              <option value="">Select…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Project (optional)</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={projectId}
              disabled={!clientId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No specific project</option>
              {(projects.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label required>Issue date</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Tax rate (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Line items</Label>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 p-2"
              >
                <Input
                  className="col-span-6"
                  placeholder="Description"
                  value={l.description}
                  onChange={(e) =>
                    updateLine(i, { description: e.target.value })
                  }
                />
                <Input
                  className="col-span-2"
                  type="number"
                  min={0}
                  placeholder="Qty"
                  value={l.quantity}
                  onChange={(e) =>
                    updateLine(i, { quantity: Number(e.target.value) || 0 })
                  }
                />
                <Input
                  className="col-span-3"
                  type="number"
                  min={0}
                  placeholder="Unit price"
                  value={l.unit_price}
                  onChange={(e) =>
                    updateLine(i, { unit_price: Number(e.target.value) || 0 })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setLines((ls) => ls.filter((_, idx) => idx !== i))
                  }
                  className="col-span-1 text-sm text-red-600 hover:underline"
                  disabled={lines.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() =>
              setLines((ls) => [
                ...ls,
                { description: "", quantity: 1, unit_price: 0 },
              ])
            }
          >
            + Add line
          </Button>
        </div>

        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium">{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">
              Tax ({Number(taxRate) || 0}%)
            </span>
            <span className="font-medium">{formatINR(taxAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="font-semibold text-slate-900">
              {formatINR(total)}
            </span>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment instructions, thank-you note, etc."
          />
        </div>
      </div>
    </Modal>
  );
}

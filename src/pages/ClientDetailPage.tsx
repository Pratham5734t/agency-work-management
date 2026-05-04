import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  useClient,
  useDeleteClient,
  useUpdateClient,
  type ClientInput,
} from "@/queries/clients";
import { useProjects } from "@/queries/projects";
import { useInvoices } from "@/queries/invoices";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatINR } from "@/lib/format";

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const canManage = profile?.role === "admin" || profile?.role === "manager";

  const client = useClient(id);
  const projects = useProjects({ clientId: id });
  const invoices = useInvoices({ clientId: id });
  const update = useUpdateClient();
  const del = useDeleteClient();

  const [editOpen, setEditOpen] = useState(false);

  if (client.isLoading) return <PageSpinner />;
  if (!client.data) {
    return (
      <EmptyState
        title="Client not found"
        action={
          <Link to="/clients">
            <Button variant="secondary">Back to clients</Button>
          </Link>
        }
      />
    );
  }

  const c = client.data;

  const handleDelete = async () => {
    if (!confirm(`Delete ${c.name}? This will also delete all their projects.`))
      return;
    try {
      await del.mutateAsync(c.id);
      toast.success("Client deleted");
      navigate("/clients", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  return (
    <div>
      <PageHeader
        title={c.name}
        description={c.industry ?? undefined}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Details" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Contact" value={c.contact_name ?? "—"} />
            <Row label="Email" value={c.contact_email ?? "—"} />
            <Row label="Phone" value={c.contact_phone ?? "—"} />
            <Row label="Website" value={c.website ?? "—"} />
            <Row
              label="Retainer"
              value={
                c.monthly_retainer ? `${formatINR(c.monthly_retainer)}/mo` : "—"
              }
            />
            <Row label="Status" value={c.is_active ? "Active" : "Inactive"} />
            <Row label="Since" value={formatDateShort(c.created_at)} />
            {c.notes ? (
              <div className="pt-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Notes
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {c.notes}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Projects"
            action={
              <Link
                to="/projects"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Manage
              </Link>
            }
          />
          <CardBody className="!p-0">
            {(projects.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState title="No projects yet for this client" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(projects.data ?? []).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {p.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {p.start_date
                            ? `Start ${formatDateShort(p.start_date)}`
                            : "—"}
                          {p.budget ? ` · Budget ${formatINR(p.budget)}` : ""}
                        </div>
                      </div>
                      <Badge tone={PROJECT_STATUS_TONE[p.status]}>
                        {PROJECT_STATUS_LABEL[p.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Invoices" />
          <CardBody className="!p-0">
            {(invoices.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState title="No invoices for this client yet" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(invoices.data ?? []).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={inv.number} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {inv.number}
                          </div>
                          <div className="text-xs text-slate-500">
                            Issued {formatDateShort(inv.issue_date)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800">
                          {formatINR(inv.total)}
                        </span>
                        <Badge tone={INVOICE_STATUS_TONE[inv.status]}>
                          {INVOICE_STATUS_LABEL[inv.status]}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {canManage && editOpen ? (
        <EditClientModal
          initial={c}
          onClose={() => setEditOpen(false)}
          onSubmit={async (patch) => {
            await update.mutateAsync({ id: c.id, patch });
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="truncate text-right text-sm text-slate-800">
        {value}
      </span>
    </div>
  );
}

function EditClientModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: ClientInput & { id: string; is_active: boolean };
  onClose: () => void;
  onSubmit: (patch: Partial<ClientInput>) => Promise<void>;
}) {
  const [form, setForm] = useState<ClientInput>({
    name: initial.name,
    industry: initial.industry ?? "",
    website: initial.website ?? "",
    contact_name: initial.contact_name ?? "",
    contact_email: initial.contact_email ?? "",
    contact_phone: initial.contact_phone ?? "",
    address: initial.address ?? "",
    notes: initial.notes ?? "",
    monthly_retainer: initial.monthly_retainer ?? null,
    is_active: initial.is_active,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (k: keyof ClientInput, v: string | number | boolean | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        industry: form.industry?.trim() || null,
        website: form.website?.trim() || null,
        contact_name: form.contact_name?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        address: form.address?.trim() || null,
        notes: form.notes?.trim() || null,
        monthly_retainer: form.monthly_retainer || null,
      });
      toast.success("Client updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit client"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <Label>Industry</Label>
            <Input
              value={form.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Contact name</Label>
            <Input
              value={form.contact_name ?? ""}
              onChange={(e) => set("contact_name", e.target.value)}
            />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              value={form.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)}
            />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input
              value={form.contact_phone ?? ""}
              onChange={(e) => set("contact_phone", e.target.value)}
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Monthly retainer (₹)</Label>
            <Input
              type="number"
              min={0}
              value={form.monthly_retainer ?? ""}
              onChange={(e) =>
                set(
                  "monthly_retainer",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              Active
            </label>
          </div>
        </div>
        <div>
          <Label>Address</Label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

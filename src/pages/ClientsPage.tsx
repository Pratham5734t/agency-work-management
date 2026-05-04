import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FieldError, Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/ui/Toast";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import {
  useClients,
  useCreateClient,
  type ClientInput,
} from "@/queries/clients";
import { formatDateShort, formatINR } from "@/lib/format";

export function ClientsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const { data, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  if (isLoading) return <PageSpinner />;

  const filtered = (data ?? []).filter((c) =>
    !search.trim()
      ? true
      : c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (c.industry ?? "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage agency clients, retainers, and contacts."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)}>+ New client</Button>
          ) : null
        }
      />
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No clients match" : "No clients yet"}
          description={
            search
              ? "Try a different search."
              : "Add your first client to get started."
          }
          action={
            canManage && !search ? (
              <Button onClick={() => setOpen(true)}>Add client</Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`}>
              <Card className="transition hover:border-brand-300 hover:shadow-md">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <Avatar name={c.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {c.name}
                        </h3>
                        {!c.is_active ? (
                          <Badge tone="neutral">Inactive</Badge>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {c.industry ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      <div className="uppercase tracking-wide">Retainer</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-800">
                        {c.monthly_retainer
                          ? `${formatINR(c.monthly_retainer)}/mo`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="uppercase tracking-wide">Since</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-800">
                        {formatDateShort(c.created_at)}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {canManage ? (
        <NewClientModal open={open} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function NewClientModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateClient();
  const toast = useToast();
  const [form, setForm] = useState<ClientInput>({
    name: "",
    industry: "",
    contact_name: "",
    contact_email: "",
    monthly_retainer: null,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof ClientInput, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({
      name: "",
      industry: "",
      contact_name: "",
      contact_email: "",
      monthly_retainer: null,
    });
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Client name is required");
      return;
    }
    try {
      await create.mutateAsync({
        ...form,
        name: form.name.trim(),
        industry: form.industry?.trim() || null,
        contact_name: form.contact_name?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        monthly_retainer: form.monthly_retainer || null,
      });
      toast.success("Client created");
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create client");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New client"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={create.isPending}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label required>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Industry</Label>
            <Input
              value={form.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="E-commerce, SaaS…"
            />
          </div>
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
        </div>
        <FieldError message={error ?? undefined} />
      </form>
    </Modal>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FieldError, Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateProject,
  useProjects,
  type ProjectInput,
} from "@/queries/projects";
import { useClients } from "@/queries/clients";
import { useTeam } from "@/queries/team";
import {
  PROJECT_KINDS,
  PROJECT_KIND_LABEL,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatINR } from "@/lib/format";
import type {
  ProjectKind,
  ProjectStatus,
} from "@/lib/database.types";

export function ProjectsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const projects = useProjects();
  const clients = useClients({ onlyActive: true });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">(
    "all",
  );
  const [open, setOpen] = useState(false);

  const clientById = useMemo(
    () => new Map((clients.data ?? []).map((c) => [c.id, c])),
    [clients.data],
  );

  if (projects.isLoading || clients.isLoading) return <PageSpinner />;

  const filtered = (projects.data ?? []).filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const clientName = clientById.get(p.client_id)?.name?.toLowerCase() ?? "";
    return p.name.toLowerCase().includes(q) || clientName.includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Track campaigns and engagements across all clients."
        actions={
          canManage ? (
            <Button
              onClick={() => setOpen(true)}
              disabled={(clients.data ?? []).length === 0}
            >
              + New project
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="max-w-xs flex-1">
          <Input
            placeholder="Search projects or clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ProjectStatus | "all")
          }
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            (projects.data ?? []).length === 0
              ? "No projects yet"
              : "No projects match"
          }
          description={
            (clients.data ?? []).length === 0
              ? "Add a client first, then create a project for them."
              : undefined
          }
          action={
            canManage && (clients.data ?? []).length > 0 ? (
              <Button onClick={() => setOpen(true)}>New project</Button>
            ) : (
              <Link to="/clients">
                <Button variant="secondary">Manage clients</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const client = clientById.get(p.client_id);
            return (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-md">
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">
                          {client?.name ?? "—"}
                        </div>
                        <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900">
                          {p.name}
                        </h3>
                      </div>
                      <Badge tone={PROJECT_STATUS_TONE[p.status]}>
                        {PROJECT_STATUS_LABEL[p.status]}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                        {PROJECT_KIND_LABEL[p.kind]}
                      </span>
                      {p.budget ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          {formatINR(p.budget)}
                        </span>
                      ) : null}
                      {p.start_date ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          Start {formatDateShort(p.start_date)}
                        </span>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {canManage ? (
        <NewProjectModal open={open} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function NewProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateProject();
  const clients = useClients({ onlyActive: true });
  const team = useTeam();
  const toast = useToast();
  const [form, setForm] = useState<ProjectInput>({
    client_id: "",
    name: "",
    kind: "social",
    status: "planning",
    description: "",
    budget: null,
    start_date: null,
    end_date: null,
    manager_id: null,
    is_visible_to_client: true,
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({
      client_id: "",
      name: "",
      kind: "social",
      status: "planning",
      description: "",
      budget: null,
      start_date: null,
      end_date: null,
      manager_id: null,
      is_visible_to_client: true,
    });
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) {
      setError("Pick a client");
      return;
    }
    if (!form.name.trim()) {
      setError("Project name is required");
      return;
    }
    try {
      await create.mutateAsync({
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || null,
      });
      toast.success("Project created");
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New project"
      size="lg"
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
          <Label required>Client</Label>
          <select
            required
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            value={form.client_id}
            onChange={(e) => set("client_id", e.target.value)}
          >
            <option value="">Select client…</option>
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label required>Project name</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Q3 Reels Sprint"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as ProjectKind)}
            >
              {PROJECT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PROJECT_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Budget (₹)</Label>
            <Input
              type="number"
              min={0}
              value={form.budget ?? ""}
              onChange={(e) =>
                set("budget", e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div>
            <Label>Start</Label>
            <Input
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => set("start_date", e.target.value || null)}
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type="date"
              value={form.end_date ?? ""}
              onChange={(e) => set("end_date", e.target.value || null)}
            />
          </div>
        </div>
        <div>
          <Label>Project manager</Label>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            value={form.manager_id ?? ""}
            onChange={(e) => set("manager_id", e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {(team.data ?? [])
              .filter((m) => m.role !== "client" && m.is_active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!!form.is_visible_to_client}
            onChange={(e) => set("is_visible_to_client", e.target.checked)}
          />
          Visible in client portal
        </label>
        <FieldError message={error ?? undefined} />
      </form>
    </Modal>
  );
}

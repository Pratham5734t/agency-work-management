import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/Avatar";
import { TaskBoard } from "@/components/TaskBoard";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteProject,
  useProject,
  useProjectMembers,
  useSetProjectMembers,
  useUpdateProject,
} from "@/queries/projects";
import { useClient } from "@/queries/clients";
import { useTasks } from "@/queries/tasks";
import { useTeam } from "@/queries/team";
import { useTimeLogs } from "@/queries/timeLogs";
import {
  PROJECT_KIND_LABEL,
  PROJECT_KINDS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatHours, formatINR } from "@/lib/format";
import type {
  ProjectKind,
  ProjectStatus,
} from "@/lib/database.types";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();
  const canManage = profile?.role === "admin" || profile?.role === "manager";

  const project = useProject(id);
  const client = useClient(project.data?.client_id);
  const tasks = useTasks({ projectId: id });
  const team = useTeam();
  const members = useProjectMembers(id);
  const timeLogs = useTimeLogs({ projectId: id });
  const update = useUpdateProject();
  const del = useDeleteProject();
  const setMembers = useSetProjectMembers();

  const [editOpen, setEditOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const totalHours = useMemo(
    () => (timeLogs.data ?? []).reduce((s, l) => s + Number(l.hours), 0),
    [timeLogs.data],
  );
  const tasksByStatus = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const t of tasks.data ?? []) counts[t.status]++;
    return counts;
  }, [tasks.data]);

  if (project.isLoading) return <PageSpinner />;
  if (!project.data) {
    return (
      <div>
        <PageHeader title="Project not found" />
        <Link to="/projects">
          <Button variant="secondary">Back to projects</Button>
        </Link>
      </div>
    );
  }

  const p = project.data;
  const memberIds = new Set((members.data ?? []).map((m) => m.profile_id));

  const handleDelete = async () => {
    if (!confirm(`Delete project "${p.name}" and all its tasks?`)) return;
    try {
      await del.mutateAsync(p.id);
      toast.success("Project deleted");
      navigate("/projects", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title={p.name}
        description={
          client.data
            ? `${client.data.name} · ${PROJECT_KIND_LABEL[p.kind]}`
            : PROJECT_KIND_LABEL[p.kind]
        }
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setTeamOpen(true)}>
                Manage team
              </Button>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Status</div>
            <div className="mt-1">
              <Badge tone={PROJECT_STATUS_TONE[p.status]}>
                {PROJECT_STATUS_LABEL[p.status]}
              </Badge>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Budget</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {p.budget ? formatINR(p.budget) : "—"}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Hours logged</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {formatHours(totalHours)}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Tasks done</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {tasksByStatus.done} /{" "}
              {tasksByStatus.todo +
                tasksByStatus.in_progress +
                tasksByStatus.review +
                tasksByStatus.done}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader title="Board" />
          <CardBody>
            <TaskBoard
              projectId={p.id}
              tasks={tasks.data ?? []}
              team={team.data ?? []}
              canEdit={canManage}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Team"
            action={
              canManage ? (
                <button
                  onClick={() => setTeamOpen(true)}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Manage
                </button>
              ) : null
            }
          />
          <CardBody>
            <ul className="space-y-2">
              {p.manager_id ? (
                <li className="flex items-center gap-2 text-sm">
                  <Avatar
                    name={
                      (team.data ?? []).find((m) => m.id === p.manager_id)
                        ?.full_name ?? ""
                    }
                    size="sm"
                  />
                  <div>
                    <div className="font-medium text-slate-900">
                      {(team.data ?? []).find((m) => m.id === p.manager_id)
                        ?.full_name || "—"}
                    </div>
                    <div className="text-xs text-slate-500">PM</div>
                  </div>
                </li>
              ) : null}
              {(team.data ?? [])
                .filter((m) => memberIds.has(m.id))
                .map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <Avatar name={m.full_name} size="sm" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {m.full_name || m.email}
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.job_title ?? "Member"}
                      </div>
                    </div>
                  </li>
                ))}
              {!p.manager_id && memberIds.size === 0 ? (
                <li className="text-xs text-slate-500">No one assigned yet.</li>
              ) : null}
            </ul>
          </CardBody>
        </Card>
      </div>

      {p.description ? (
        <Card className="mt-6">
          <CardHeader title="Description" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {p.description}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader title="Project info" />
        <CardBody>
          <div className="grid grid-cols-2 gap-y-2 text-sm md:grid-cols-4">
            <Info label="Type" value={PROJECT_KIND_LABEL[p.kind]} />
            <Info label="Start" value={formatDateShort(p.start_date)} />
            <Info label="End" value={formatDateShort(p.end_date)} />
            <Info
              label="Client visibility"
              value={p.is_visible_to_client ? "Visible" : "Hidden"}
            />
          </div>
        </CardBody>
      </Card>

      {canManage && editOpen ? (
        <EditProjectModal
          initial={p}
          onClose={() => setEditOpen(false)}
          onSave={async (patch) => {
            await update.mutateAsync({ id: p.id, patch });
            toast.success("Project updated");
            setEditOpen(false);
          }}
        />
      ) : null}

      {canManage && teamOpen ? (
        <ManageTeamModal
          projectId={p.id}
          managerId={p.manager_id ?? null}
          team={team.data ?? []}
          memberIds={memberIds}
          onClose={() => setTeamOpen(false)}
          onSaveMembers={async (ids) => {
            await setMembers.mutateAsync({ projectId: p.id, profileIds: ids });
            toast.success("Team updated");
            setTeamOpen(false);
          }}
          onSaveManager={async (managerId) => {
            await update.mutateAsync({
              id: p.id,
              patch: { manager_id: managerId },
            });
          }}
        />
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}

interface EditState {
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  description: string;
  budget: string;
  start_date: string;
  end_date: string;
  is_visible_to_client: boolean;
}

function EditProjectModal({
  initial,
  onClose,
  onSave,
}: {
  initial: {
    name: string;
    kind: ProjectKind;
    status: ProjectStatus;
    description: string | null;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
    is_visible_to_client: boolean;
  };
  onClose: () => void;
  onSave: (
    patch: Partial<{
      name: string;
      kind: ProjectKind;
      status: ProjectStatus;
      description: string | null;
      budget: number | null;
      start_date: string | null;
      end_date: string | null;
      is_visible_to_client: boolean;
    }>,
  ) => Promise<void>;
}) {
  const [form, setForm] = useState<EditState>({
    name: initial.name,
    kind: initial.kind,
    status: initial.status,
    description: initial.description ?? "",
    budget: initial.budget == null ? "" : String(initial.budget),
    start_date: initial.start_date ?? "",
    end_date: initial.end_date ?? "",
    is_visible_to_client: initial.is_visible_to_client,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        kind: form.kind,
        status: form.status,
        description: form.description.trim() || null,
        budget: form.budget ? Number(form.budget) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_visible_to_client: form.is_visible_to_client,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit project"
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
        <div>
          <Label required>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as ProjectKind })
              }
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
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as ProjectStatus })
              }
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Budget (₹)</Label>
            <Input
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_visible_to_client}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_visible_to_client: e.target.checked,
                  })
                }
              />
              Visible in client portal
            </label>
          </div>
          <div>
            <Label>Start</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}

function ManageTeamModal({
  managerId,
  team,
  memberIds,
  onClose,
  onSaveMembers,
  onSaveManager,
}: {
  projectId: string;
  managerId: string | null;
  team: { id: string; full_name: string; email: string; role: string; is_active: boolean }[];
  memberIds: Set<string>;
  onClose: () => void;
  onSaveMembers: (ids: string[]) => Promise<void>;
  onSaveManager: (managerId: string | null) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds));
  const [pm, setPm] = useState<string>(managerId ?? "");
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveManager(pm || null);
      await onSaveMembers([...selected]);
    } finally {
      setSaving(false);
    }
  };

  const eligible = team.filter((m) => m.role !== "client" && m.is_active);

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage project team"
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
        <div>
          <Label>Project manager</Label>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            value={pm}
            onChange={(e) => setPm(e.target.value)}
          >
            <option value="">Unassigned</option>
            {eligible.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Members</Label>
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {eligible.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  id={`mem-${m.id}`}
                />
                <label htmlFor={`mem-${m.id}`} className="flex flex-1 items-center gap-2 text-sm">
                  <Avatar name={m.full_name || m.email} size="xs" />
                  <span>{m.full_name || m.email}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

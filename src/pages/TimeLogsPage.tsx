import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateTimeLog,
  useDeleteTimeLog,
  useTimeLogs,
} from "@/queries/timeLogs";
import { useProjects } from "@/queries/projects";
import { useTasks } from "@/queries/tasks";
import { formatDateShort, formatHours } from "@/lib/format";

export function TimeLogsPage() {
  const { profile } = useAuth();
  const isAdminOrMgr =
    profile?.role === "admin" || profile?.role === "manager";

  const memberFilter = isAdminOrMgr ? undefined : profile?.id;
  const logs = useTimeLogs(
    memberFilter ? { memberId: memberFilter } : undefined,
  );
  const projects = useProjects();
  const [open, setOpen] = useState(false);
  const del = useDeleteTimeLog();
  const toast = useToast();

  const projectMap = useMemo(
    () => new Map((projects.data ?? []).map((p) => [p.id, p])),
    [projects.data],
  );

  if (logs.isLoading || projects.isLoading) return <PageSpinner />;

  const totalHours = (logs.data ?? []).reduce(
    (s, l) => s + Number(l.hours),
    0,
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this time log?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Time log deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Time logs"
        description={
          isAdminOrMgr
            ? "Hours logged across the team."
            : "Track your time on projects and tasks."
        }
        actions={<Button onClick={() => setOpen(true)}>+ Log time</Button>}
      />

      <Card className="mb-4">
        <CardBody className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {formatHours(totalHours)}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {(logs.data ?? []).length} entries
          </div>
        </CardBody>
      </Card>

      {(logs.data ?? []).length === 0 ? (
        <EmptyState
          title="No time logged yet"
          action={<Button onClick={() => setOpen(true)}>Log your first hours</Button>}
        />
      ) : (
        <Card>
          <CardHeader title="Recent entries" />
          <CardBody className="!p-0">
            <ul className="divide-y divide-slate-100">
              {(logs.data ?? []).map((l) => {
                const project = projectMap.get(l.project_id);
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {project?.name ?? "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateShort(l.log_date)} ·{" "}
                        {l.is_billable ? "Billable" : "Non-billable"}
                        {l.description ? ` · ${l.description}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatHours(Number(l.hours))}
                      </span>
                      {(isAdminOrMgr || l.member_id === profile?.id) ? (
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {open ? (
        <NewTimeLogModal
          onClose={() => setOpen(false)}
          memberId={profile!.id}
        />
      ) : null}
    </div>
  );
}

function NewTimeLogModal({
  memberId,
  onClose,
}: {
  memberId: string;
  onClose: () => void;
}) {
  const create = useCreateTimeLog();
  const projects = useProjects();
  const [projectId, setProjectId] = useState<string>("");
  const tasks = useTasks(projectId ? { projectId } : undefined);
  const [taskId, setTaskId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [billable, setBillable] = useState(true);
  const toast = useToast();

  const onSave = async () => {
    if (!projectId) return;
    if (!hours || Number(hours) <= 0) return;
    try {
      await create.mutateAsync({
        member_id: memberId,
        project_id: projectId,
        task_id: taskId || null,
        log_date: logDate,
        hours: Number(hours),
        description: description.trim() || null,
        is_billable: billable,
      });
      toast.success("Time logged");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Log time"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            loading={create.isPending}
            disabled={!projectId || !hours}
          >
            Log
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label required>Project</Label>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setTaskId("");
            }}
          >
            <option value="">Select project…</option>
            {(projects.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {projectId ? (
          <div>
            <Label>Task (optional)</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">No specific task</option>
              {(tasks.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Date</Label>
            <Input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </div>
          <div>
            <Label required>Hours</Label>
            <Input
              type="number"
              step={0.25}
              min={0.25}
              max={24}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="2.5"
            />
          </div>
        </div>
        <div>
          <Label>What did you work on?</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          Billable
        </label>
      </div>
    </Modal>
  );
}

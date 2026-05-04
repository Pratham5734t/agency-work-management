import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useUpdateTask } from "@/queries/tasks";
import { useProjects } from "@/queries/projects";
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TONE,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
} from "@/lib/labels";
import { formatDateShort } from "@/lib/format";
import type { TaskStatus } from "@/lib/database.types";

export function TasksPage() {
  const { profile } = useAuth();
  const tasks = useTasks({ assigneeId: profile?.id });
  const projects = useProjects();
  const update = useUpdateTask();
  const toast = useToast();
  const [filter, setFilter] = useState<TaskStatus | "open" | "all">("open");

  const projectMap = useMemo(
    () => new Map((projects.data ?? []).map((p) => [p.id, p])),
    [projects.data],
  );

  if (tasks.isLoading || projects.isLoading) return <PageSpinner />;

  const all = tasks.data ?? [];
  const filtered = all.filter((t) => {
    if (filter === "all") return true;
    if (filter === "open") return t.status !== "done";
    return t.status === filter;
  });

  const setStatus = async (id: string, status: TaskStatus) => {
    try {
      await update.mutateAsync({ id, patch: { status } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="My tasks"
        description="Everything assigned to you across projects."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["open", "Open"],
            ["all", "All"],
            ...TASK_STATUSES.map((s) => [s, TASK_STATUS_LABEL[s]] as const),
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              filter === k
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "open" ? "No open tasks" : "No tasks match"}
          description={
            filter === "open" ? "You're all caught up." : undefined
          }
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <ul className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const overdue =
                  !!t.due_date &&
                  t.status !== "done" &&
                  new Date(t.due_date) < new Date();
                const project = projectMap.get(t.project_id);
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {t.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {project ? (
                          <Link
                            to={`/projects/${project.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {project.name}
                          </Link>
                        ) : null}
                        {t.due_date ? (
                          <span className={overdue ? "text-red-600" : ""}>
                            {overdue ? "⚠ " : ""}Due{" "}
                            {formatDateShort(t.due_date)}
                          </span>
                        ) : null}
                        <Badge tone={TASK_PRIORITY_TONE[t.priority]}>
                          {TASK_PRIORITY_LABEL[t.priority]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={t.status}
                        onChange={(e) =>
                          setStatus(t.id, e.target.value as TaskStatus)
                        }
                        className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      {project ? (
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="secondary" size="sm">
                            Open
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

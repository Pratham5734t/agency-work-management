import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProject } from "@/queries/projects";
import { useTasks } from "@/queries/tasks";
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUSES,
} from "@/lib/labels";
import { formatDateShort } from "@/lib/format";

export function ClientPortalProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const tasks = useTasks({ projectId: id });

  if (project.isLoading) return <PageSpinner />;
  if (!project.data) {
    return (
      <div>
        <PageHeader title="Project not available" />
        <Link to="/portal/projects">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }
  const p = project.data;

  return (
    <div>
      <PageHeader
        title={p.name}
        description={PROJECT_KIND_LABEL[p.kind]}
        actions={
          <Badge tone={PROJECT_STATUS_TONE[p.status]}>
            {PROJECT_STATUS_LABEL[p.status]}
          </Badge>
        }
      />

      {p.description ? (
        <Card className="mb-6">
          <CardHeader title="About this project" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {p.description}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-slate-500">Start</div>
                <div className="font-medium">{formatDateShort(p.start_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Target end</div>
                <div className="font-medium">{formatDateShort(p.end_date)}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="What we're working on" />
        <CardBody>
          {(tasks.data ?? []).length === 0 ? (
            <EmptyState title="No deliverables shared yet" />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {TASK_STATUSES.map((s) => {
                const items = (tasks.data ?? []).filter((t) => t.status === s);
                return (
                  <div
                    key={s}
                    className="rounded-xl border border-slate-200 bg-slate-50/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">
                        {TASK_STATUS_LABEL[s]}
                      </div>
                      <span className="rounded-full bg-slate-200 px-2 text-xs font-medium text-slate-700">
                        {items.length}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {items.map((t) => (
                        <li
                          key={t.id}
                          className="rounded-lg border border-slate-200 bg-white p-2"
                        >
                          <div className="text-sm font-medium text-slate-900">
                            {t.title}
                          </div>
                          {t.due_date ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Due {formatDateShort(t.due_date)}
                            </div>
                          ) : null}
                        </li>
                      ))}
                      {items.length === 0 ? (
                        <li className="text-xs text-slate-400">—</li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/queries/projects";
import { useTasks } from "@/queries/tasks";
import { useClients } from "@/queries/clients";
import { useTimeLogs } from "@/queries/timeLogs";
import { useInvoices } from "@/queries/invoices";
import { useProfileMap } from "@/queries/team";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TONE,
} from "@/lib/labels";
import {
  formatDateShort,
  formatHours,
  formatINR,
  formatLocalDateISO,
} from "@/lib/format";

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay() || 7; // Mon=1..Sun=7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return formatLocalDateISO(d);
}

export function DashboardPage() {
  const { profile } = useAuth();
  const projects = useProjects();
  const clients = useClients();
  const myTasks = useTasks({ assigneeId: profile?.id });
  const timeWeek = useTimeLogs({
    memberId: profile?.id,
    from: startOfWeekISO(),
  });
  const invoices = useInvoices();
  const { map: profileMap } = useProfileMap();

  const stats = useMemo(() => {
    const activeProjects =
      projects.data?.filter((p) => p.status === "active").length ?? 0;
    const openTasks =
      myTasks.data?.filter((t) => t.status !== "done").length ?? 0;
    const hoursWeek =
      timeWeek.data?.reduce((sum, l) => sum + Number(l.hours), 0) ?? 0;
    const outstanding =
      invoices.data
        ?.filter((i) => i.status === "sent" || i.status === "overdue")
        .reduce((sum, i) => sum + Number(i.total), 0) ?? 0;
    return { activeProjects, openTasks, hoursWeek, outstanding };
  }, [projects.data, myTasks.data, timeWeek.data, invoices.data]);

  if (
    projects.isLoading ||
    myTasks.isLoading ||
    clients.isLoading ||
    invoices.isLoading
  ) {
    return <PageSpinner />;
  }

  const recentProjects = (projects.data ?? []).slice(0, 6);
  const upcomingTasks = (myTasks.data ?? [])
    .filter((t) => t.status !== "done")
    .slice(0, 8);
  const clientById = new Map((clients.data ?? []).map((c) => [c.id, c]));

  return (
    <div>
      <PageHeader
        title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋`}
        description="Here's what's happening across your agency today."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active projects" value={stats.activeProjects} />
        <StatCard label="My open tasks" value={stats.openTasks} />
        <StatCard label="Hours this week" value={formatHours(stats.hoursWeek)} />
        <StatCard label="Outstanding" value={formatINR(stats.outstanding)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent projects"
            action={
              <Link
                to="/projects"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="!p-0">
            {recentProjects.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No projects yet"
                  description="Create your first project to start tracking work."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentProjects.map((p) => {
                  const client = clientById.get(p.client_id);
                  return (
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
                            {client?.name ?? "—"}
                            {p.start_date
                              ? ` · started ${formatDateShort(p.start_date)}`
                              : ""}
                          </div>
                        </div>
                        <Badge tone={PROJECT_STATUS_TONE[p.status]}>
                          {PROJECT_STATUS_LABEL[p.status]}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="My upcoming tasks"
            action={
              <Link
                to="/tasks"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Open
              </Link>
            }
          />
          <CardBody className="!p-0">
            {upcomingTasks.length === 0 ? (
              <div className="p-5">
                <EmptyState title="You're all caught up" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcomingTasks.map((t) => {
                  const overdue =
                    !!t.due_date && new Date(t.due_date) < new Date();
                  return (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {t.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {t.due_date
                            ? `Due ${formatDateShort(t.due_date)}`
                            : "No due date"}
                          {t.assignee_id ? (
                            <span className="ml-1">
                              · {profileMap.get(t.assignee_id)?.full_name ?? ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Badge
                        tone={
                          overdue ? "danger" : TASK_PRIORITY_TONE[t.priority]
                        }
                      >
                        {overdue ? "Overdue" : TASK_PRIORITY_LABEL[t.priority]}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top clients" />
          <CardBody className="!p-0">
            {(clients.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState title="No clients yet" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(clients.data ?? []).slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={c.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        <Link
                          to={`/clients/${c.id}`}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {c.industry ?? "—"}
                      </div>
                    </div>
                    {c.monthly_retainer ? (
                      <span className="text-sm font-medium text-slate-700">
                        {formatINR(c.monthly_retainer)}/mo
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction to="/clients" emoji="🏢" label="Add client" />
              <QuickAction to="/projects" emoji="🚀" label="New project" />
              <QuickAction to="/tasks" emoji="✅" label="Track tasks" />
              <QuickAction to="/invoices" emoji="💰" label="Create invoice" />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
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

function QuickAction({
  to,
  emoji,
  label,
}: {
  to: string;
  emoji: string;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}

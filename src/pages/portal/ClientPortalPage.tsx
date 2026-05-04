import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useClient } from "@/queries/clients";
import { useProjects } from "@/queries/projects";
import { useInvoices } from "@/queries/invoices";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatINR } from "@/lib/format";

export function ClientPortalPage() {
  const { profile } = useAuth();
  const client = useClient(profile?.client_id ?? undefined);
  const projects = useProjects(
    profile?.client_id ? { clientId: profile.client_id } : undefined,
  );
  const invoices = useInvoices(
    profile?.client_id ? { clientId: profile.client_id } : undefined,
  );

  if (!profile?.client_id) {
    return (
      <EmptyState
        title="Account not yet linked"
        description="Your account isn't linked to a client workspace. Ask your account manager to link it."
      />
    );
  }
  if (client.isLoading || projects.isLoading) return <PageSpinner />;

  const activeProjects = (projects.data ?? []).filter(
    (p) => p.status === "active" || p.status === "planning",
  );
  const outstanding = (invoices.data ?? [])
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.total), 0);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile.full_name?.split(" ")[0] || "there"} 👋`}
        description={client.data?.name ?? ""}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Active projects" value={activeProjects.length} />
        <StatCard label="Total projects" value={(projects.data ?? []).length} />
        <StatCard label="Outstanding" value={formatINR(outstanding)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your projects"
            action={
              <Link
                to="/portal/projects"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="!p-0">
            {(projects.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState title="No projects shared yet" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(projects.data ?? []).slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/portal/projects/${p.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {p.start_date
                            ? `Since ${formatDateShort(p.start_date)}`
                            : "—"}
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

        <Card>
          <CardHeader
            title="Invoices"
            action={
              <Link
                to="/portal/invoices"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="!p-0">
            {(invoices.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState title="No invoices yet" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(invoices.data ?? []).slice(0, 5).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {inv.number}
                      </div>
                      <div className="text-xs text-slate-500">
                        Issued {formatDateShort(inv.issue_date)}
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
                  </li>
                ))}
              </ul>
            )}
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

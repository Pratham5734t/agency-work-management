import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/queries/projects";
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort } from "@/lib/format";

export function ClientPortalProjectsPage() {
  const { profile } = useAuth();
  const projects = useProjects(
    profile?.client_id ? { clientId: profile.client_id } : undefined,
  );

  if (projects.isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Projects" description="Engagements your agency is running for you." />
      {(projects.data ?? []).length === 0 ? (
        <EmptyState title="Nothing here yet" description="Your agency hasn't shared any projects." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((p) => (
            <Link key={p.id} to={`/portal/projects/${p.id}`}>
              <Card className="transition hover:border-brand-300 hover:shadow-md">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {p.name}
                    </h3>
                    <Badge tone={PROJECT_STATUS_TONE[p.status]}>
                      {PROJECT_STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {PROJECT_KIND_LABEL[p.kind]} ·{" "}
                    {p.start_date ? `Started ${formatDateShort(p.start_date)}` : "—"}
                  </div>
                  {p.description ? (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-700">
                      {p.description}
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

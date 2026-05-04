import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoices } from "@/queries/invoices";
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatINR } from "@/lib/format";

export function ClientPortalInvoicesPage() {
  const { profile } = useAuth();
  const invoices = useInvoices(
    profile?.client_id ? { clientId: profile.client_id } : undefined,
  );

  if (invoices.isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Invoices" description="Bills issued by your agency." />
      {(invoices.data ?? []).length === 0 ? (
        <EmptyState title="No invoices yet" />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <ul className="divide-y divide-slate-100">
              {(invoices.data ?? []).map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {inv.number}
                    </div>
                    <div className="text-xs text-slate-500">
                      Issued {formatDateShort(inv.issue_date)}
                      {inv.due_date
                        ? ` · Due ${formatDateShort(inv.due_date)}`
                        : ""}
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
          </CardBody>
        </Card>
      )}
      <div className="mt-4">
        <Link to="/portal">
          <Button variant="secondary">Back to overview</Button>
        </Link>
      </div>
    </div>
  );
}

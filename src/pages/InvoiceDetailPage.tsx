import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteInvoice,
  useInvoice,
  useInvoiceItems,
  useUpdateInvoiceStatus,
} from "@/queries/invoices";
import { useClient } from "@/queries/clients";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "@/lib/labels";
import { formatDateShort, formatINR } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/database.types";

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const canManage = profile?.role === "admin" || profile?.role === "manager";

  const invoice = useInvoice(id);
  const items = useInvoiceItems(id);
  const client = useClient(invoice.data?.client_id);
  const updateStatus = useUpdateInvoiceStatus();
  const del = useDeleteInvoice();

  if (invoice.isLoading) return <PageSpinner />;
  if (!invoice.data) {
    return (
      <div>
        <PageHeader title="Invoice not found" />
        <Link to="/invoices">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }

  const inv = invoice.data;

  const handleStatus = async (status: InvoiceStatus) => {
    try {
      await updateStatus.mutateAsync({ id: inv.id, status });
      toast.success(`Invoice marked ${INVOICE_STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete invoice ${inv.number}?`)) return;
    try {
      await del.mutateAsync(inv.id);
      toast.success("Invoice deleted");
      navigate("/invoices", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title={inv.number}
        description={client.data?.name ?? ""}
        actions={
          canManage ? (
            <>
              <select
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                value={inv.status}
                onChange={(e) =>
                  handleStatus(e.target.value as InvoiceStatus)
                }
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INVOICE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </>
          ) : (
            <Badge tone={INVOICE_STATUS_TONE[inv.status]}>
              {INVOICE_STATUS_LABEL[inv.status]}
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Line items" />
          <CardBody className="!p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-5 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items.data ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-5 py-2 text-slate-800">{it.description}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {Number(it.quantity)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatINR(it.unit_price)}
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-slate-900">
                      {formatINR(it.amount)}
                    </td>
                  </tr>
                ))}
                {(items.data ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-6 text-center text-sm text-slate-500"
                    >
                      No line items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-slate-600">
                    Subtotal
                  </td>
                  <td className="px-5 py-2 text-right font-medium">
                    {formatINR(inv.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-slate-600">
                    Tax ({Number(inv.tax_rate)}%)
                  </td>
                  <td className="px-5 py-2 text-right font-medium">
                    {formatINR(inv.tax_amount)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="px-5 py-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right text-base font-semibold">
                    {formatINR(inv.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Status">
              <Badge tone={INVOICE_STATUS_TONE[inv.status]}>
                {INVOICE_STATUS_LABEL[inv.status]}
              </Badge>
            </Row>
            <Row label="Issued" plainValue={formatDateShort(inv.issue_date)} />
            <Row label="Due" plainValue={formatDateShort(inv.due_date)} />
            <Row label="Paid" plainValue={formatDateShort(inv.paid_at)} />
            <Row
              label="Client"
              plainValue={client.data?.name ?? "—"}
            />
            {inv.notes ? (
              <div className="pt-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Notes
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {inv.notes}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  plainValue,
  children,
}: {
  label: string;
  plainValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="text-right text-sm text-slate-800">
        {children ?? plainValue ?? "—"}
      </span>
    </div>
  );
}

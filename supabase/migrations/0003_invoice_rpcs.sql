-- RPCs that keep invoices consistent.

-- Recompute totals from invoice_items.
create or replace function public.recompute_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12,2);
  v_rate numeric(5,2);
  v_tax numeric(12,2);
begin
  select coalesce(sum(amount), 0)
    into v_subtotal
    from public.invoice_items
    where invoice_id = p_invoice_id;

  select tax_rate into v_rate from public.invoices where id = p_invoice_id;
  v_tax := round(v_subtotal * coalesce(v_rate, 0) / 100, 2);

  update public.invoices
     set subtotal = v_subtotal,
         tax_amount = v_tax,
         total = v_subtotal + v_tax
   where id = p_invoice_id;
end;
$$;

-- Generate next invoice number, e.g. INV-2026-0001
-- Uses a transaction-scoped advisory lock to serialize concurrent callers,
-- preventing two parallel invoice creations from generating the same number.
create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(current_date, 'YYYY');
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('invoice_number_' || v_year));
  select count(*) + 1
    into v_count
    from public.invoices
    where to_char(issue_date, 'YYYY') = v_year;
  return 'INV-' || v_year || '-' || lpad(v_count::text, 4, '0');
end;
$$;

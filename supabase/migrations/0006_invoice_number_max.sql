-- Fix: invoice number generation used count(*)+1, which produces a duplicate
-- if an invoice is later deleted. Switch both `next_invoice_number()` and
-- `create_invoice_with_items()` to derive the next sequence value from the
-- maximum existing suffix for the year, so the sequence is monotonically
-- increasing regardless of deletions.

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
  -- Use max(suffix)+1 (not count+1) so deletions never cause the next
  -- generated number to collide with an existing one.
  select coalesce(
           max(
             nullif(
               regexp_replace(number, '^INV-' || v_year || '-', ''),
               ''
             )::integer
           ),
           0
         ) + 1
    into v_count
    from public.invoices
    where number like 'INV-' || v_year || '-%';
  return 'INV-' || v_year || '-' || lpad(v_count::text, 4, '0');
end;
$$;

create or replace function public.create_invoice_with_items(
  p_client_id uuid,
  p_project_id uuid,
  p_issue_date date,
  p_due_date date,
  p_tax_rate numeric,
  p_notes text,
  p_items jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(current_date, 'YYYY');
  v_count integer;
  v_number text;
  v_invoice public.invoices;
  v_creator uuid := auth.uid();
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2);
  v_pos integer := 0;
  v_item jsonb;
  v_qty numeric;
  v_unit numeric;
  v_amount numeric;
begin
  if not public.is_admin_or_manager() then
    raise exception 'permission denied: admin or manager role required'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('invoice_number_' || v_year));
  -- Use max(suffix)+1 (not count+1) so deletions never cause the next
  -- generated number to collide with an existing one.
  select coalesce(
           max(
             nullif(
               regexp_replace(number, '^INV-' || v_year || '-', ''),
               ''
             )::integer
           ),
           0
         ) + 1
    into v_count
    from public.invoices
    where number like 'INV-' || v_year || '-%';
  v_number := 'INV-' || v_year || '-' || lpad(v_count::text, 4, '0');

  insert into public.invoices(
    number, client_id, project_id, issue_date, due_date,
    tax_rate, notes, created_by
  )
  values (
    v_number, p_client_id, p_project_id, p_issue_date, p_due_date,
    coalesce(p_tax_rate, 0), p_notes, v_creator
  )
  returning * into v_invoice;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      v_qty := coalesce((v_item->>'quantity')::numeric, 0);
      v_unit := coalesce((v_item->>'unit_price')::numeric, 0);
      v_amount := round(v_qty * v_unit, 2);
      insert into public.invoice_items(
        invoice_id, description, quantity, unit_price, amount, position
      )
      values (
        v_invoice.id,
        coalesce(v_item->>'description', ''),
        v_qty,
        v_unit,
        v_amount,
        v_pos
      );
      v_subtotal := v_subtotal + v_amount;
      v_pos := v_pos + 1;
    end loop;
  end if;

  v_tax := round(v_subtotal * coalesce(p_tax_rate, 0) / 100, 2);
  update public.invoices
     set subtotal = v_subtotal,
         tax_amount = v_tax,
         total = v_subtotal + v_tax
   where id = v_invoice.id
   returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke execute on function public.create_invoice_with_items(uuid, uuid, date, date, numeric, text, jsonb) from public, anon;
grant execute on function public.create_invoice_with_items(uuid, uuid, date, date, numeric, text, jsonb) to authenticated;

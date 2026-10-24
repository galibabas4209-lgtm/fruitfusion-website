-- Fruit Fusion: owner order visibility + verified-payment confirmation.
--
-- Run in the Supabase SQL editor (or `supabase db push`) for the SAME project
-- the site's VITE_SUPABASE_URL points to. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Owner helper: the dashboard signs in with Supabase Auth as the owner.
-- ---------------------------------------------------------------------------
create or replace function public.is_fruitfusion_owner()
returns boolean
language sql
stable
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'ekunola99@gmail.com', false);
$$;

-- ---------------------------------------------------------------------------
-- 2. RLS: anonymous visitors cannot read orders; the owner can read every
--    order (any status) and its items, and can change the fulfilment status.
--    Checkout and verification write with the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Owner can read orders" on public.orders;
create policy "Owner can read orders" on public.orders
  for select to authenticated
  using (public.is_fruitfusion_owner());

drop policy if exists "Owner can update orders" on public.orders;
create policy "Owner can update orders" on public.orders
  for update to authenticated
  using (public.is_fruitfusion_owner())
  with check (public.is_fruitfusion_owner());

drop policy if exists "Owner can read order items" on public.order_items;
create policy "Owner can read order items" on public.order_items
  for select to authenticated
  using (public.is_fruitfusion_owner());

grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Idempotency marker so stock is deducted at most once per order.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists stock_deducted_at timestamptz;

-- Orders already marked paid before this migration were handled by the old
-- flow; never deduct their stock again.
update public.orders
  set paid_at = coalesce(paid_at, created_at),
      stock_deducted_at = coalesce(stock_deducted_at, created_at)
  where payment_status = 'paid';

create unique index if not exists orders_payment_reference_key
  on public.orders (payment_reference)
  where payment_reference is not null;

-- Only the server (service role / this migration's definer functions) may
-- change payment fields. The owner can still change the order status.
create or replace function public.guard_order_payment_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and (new.payment_status is distinct from old.payment_status
          or new.payment_reference is distinct from old.payment_reference
          or new.total_amount is distinct from old.total_amount
          or new.paid_at is distinct from old.paid_at
          or new.stock_deducted_at is distinct from old.stock_deducted_at) then
    raise exception 'Payment fields can only be changed by server-side verification';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_order_payment_fields on public.orders;
create trigger guard_order_payment_fields
  before update on public.orders
  for each row execute function public.guard_order_payment_fields();

-- ---------------------------------------------------------------------------
-- 4. Atomic, idempotent confirmation. Called only by paystack-verify (service
--    role) AFTER Paystack has reported the transaction as successful.
--    - Locks the order row, so concurrent/retried verifications serialise.
--    - Rejects amount mismatches.
--    - Marks payment_status = 'paid', status = 'confirmed'.
--    - Deducts stock exactly once (guarded by stock_deducted_at).
-- ---------------------------------------------------------------------------
create or replace function public.confirm_paid_order(p_reference text, p_amount_kobo bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  item record;
begin
  select * into o from public.orders where payment_reference = p_reference for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  if round(o.total_amount * 100) <> p_amount_kobo then
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'order_id', o.id);
  end if;

  if o.stock_deducted_at is null then
    for item in
      select product_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = o.id and product_id is not null
      group by product_id
    loop
      update public.products
        set stock = greatest(coalesce(stock, 0) - item.qty, 0)
        where id = item.product_id;
    end loop;
  end if;

  update public.orders
    set payment_status = 'paid',
        status = case when status in ('pending', 'new') or status is null then 'confirmed' else status end,
        paid_at = coalesce(paid_at, now()),
        stock_deducted_at = coalesce(stock_deducted_at, now())
    where id = o.id;

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'already_confirmed', o.payment_status = 'paid' and o.stock_deducted_at is not null
  );
end;
$$;

revoke all on function public.confirm_paid_order(text, bigint) from public, anon, authenticated;
grant execute on function public.confirm_paid_order(text, bigint) to service_role;

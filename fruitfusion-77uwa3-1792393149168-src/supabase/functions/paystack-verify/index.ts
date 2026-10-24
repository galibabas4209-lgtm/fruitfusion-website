// Supabase Edge Function: paystack-verify
// Deploy: supabase functions deploy paystack-verify
// Secrets (set with `supabase secrets set`, never in frontend code):
//   PAYSTACK_SECRET_KEY, ALLOWED_ORIGINS (optional, comma separated)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Verifies the transaction with Paystack, then confirms the EXISTING order that
// paystack-initialize created (matched by payment_reference). It never inserts
// orders. Stock deduction and status changes happen atomically and at most once
// inside the confirm_paid_order() database function.
import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ||
  'https://fruitfusionparfait.com,https://www.fruitfusionparfait.com')
  .split(',').map((o) => o.trim()).filter(Boolean);

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = cors(origin);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { verified: false, error: 'Method not allowed.' });
  if (!origin || !allowedOrigins.includes(origin)) return reply(403, { verified: false, error: 'Unrecognized website origin.' });

  const { reference } = await req.json().catch(() => ({}));
  if (typeof reference !== 'string' || !/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) {
    return reply(400, { verified: false, error: 'Invalid payment reference.' });
  }

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return reply(500, { verified: false, error: 'Payment verification is not configured.' });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, payment_status')
    .eq('payment_reference', reference)
    .maybeSingle();
  if (orderError) {
    console.error('Order lookup failed', orderError);
    return reply(500, { verified: false, error: 'Could not look up the order.' });
  }
  if (!order) return reply(404, { verified: false, error: 'No order matches this payment reference.' });

  const res = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
    headers: { Authorization: 'Bearer ' + secret },
  });
  const paystack = await res.json().catch(() => null);
  const tx = paystack?.data;

  if (!res.ok || !paystack?.status || !tx) {
    return reply(502, { verified: false, error: 'Could not verify the payment with Paystack.' });
  }
  if (tx.status !== 'success' || tx.reference !== reference || (tx.currency && tx.currency !== 'NGN')) {
    if (['failed', 'abandoned', 'reversed'].includes(tx.status) && order.payment_status !== 'paid') {
      await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', order.id).neq('payment_status', 'paid');
    }
    return reply(200, { verified: false, message: 'Payment was not successful (' + tx.status + ').' });
  }

  const { data: result, error: confirmError } = await supabase.rpc('confirm_paid_order', {
    p_reference: reference,
    p_amount_kobo: Number(tx.amount),
  });
  if (confirmError) {
    console.error('confirm_paid_order failed', confirmError);
    return reply(500, { verified: false, error: 'Payment received but the order could not be confirmed. Please contact Fruit Fusion.' });
  }
  if (!result?.ok) {
    console.error('confirm_paid_order rejected', reference, result);
    return reply(409, { verified: false, error: 'Payment amount does not match the order. Please contact Fruit Fusion.' });
  }

  return reply(200, {
    verified: true,
    order_id: result.order_id,
    already_confirmed: Boolean(result.already_confirmed),
    message: 'Payment verified and order confirmed.',
  });
});

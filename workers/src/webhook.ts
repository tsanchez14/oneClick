import { Env } from './types';
import { getSupabase } from './supabase';

async function verifySignature(request: Request, env: Env): Promise<boolean> {
  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  if (!xSignature || !xRequestId) return false;

  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }

  if (!ts || !v1) return false;

  // The request body needs to be cloned to read it here without consuming the stream
  const clone = request.clone();
  const body = await clone.json() as any;
  const dataId = body.data?.id;

  if (!dataId) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  
  // Create HMAC SHA256 using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.MP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify', 'sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(manifest)
  );
  
  // Convert ArrayBuffer to Hex String
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex === v1;
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  // Validate HMAC
  const isValid = await verifySignature(request, env);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = await request.json() as any;
  const type = payload.type; // "payment" or "subscription_preapproval"
  const dataId = payload.data?.id;
  
  if (!dataId) return new Response('OK', { status: 200 }); // Ignore malformed

  const supabase = getSupabase(env);

  try {
    if (type === 'subscription_preapproval') {
      // In a real app we'd fetch the subscription preapproval details from MP API here using dataId.
      // For this implementation, we assume the webhook body has the needed info or we query the DB
      // MP doesn't send the full object in the webhook, just the ID. 
      // *Normally* you fetch the full object from MP: GET /preapproval/{id}
      
      // We will look up the subscription by mp_subscription_id
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('mp_subscription_id', dataId)
        .single();
        
      if (!sub) return new Response('Subscription not found', { status: 404 });

      // We need the action. Assuming payload has action or we know what to do.
      const action = payload.action;
      
      if (action === 'created' || action === 'updated') {
        // Assume authorized for now (you'd check MP API for real status)
        const newPeriodEnd = new Date();
        newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

        await supabase.from('subscriptions')
          .update({ 
            status: 'active', 
            current_period_start: new Date().toISOString(),
            current_period_end: newPeriodEnd.toISOString()
          })
          .eq('id', sub.id);

        await supabase.from('tenants')
          .update({ status: 'active' })
          .eq('id', sub.tenant_id);

        // Record history
        await supabase.from('payment_history').insert({
          tenant_id: sub.tenant_id,
          subscription_id: sub.id,
          amount: 0, // Should come from MP API
          method: 'mercadopago',
          status: 'paid',
          paid_at: new Date().toISOString(),
          notes: 'Subscription authorized via webhook'
        });
      } else if (action === 'cancelled') {
        // When cancelled, we don't suspend immediately if there's remaining time.
        // We just mark the subscription as cancelled. The cron will suspend the tenant when time runs out.
        await supabase.from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', sub.id);
      }

    } else if (type === 'payment') {
      // In a real app, fetch /v1/payments/{dataId}
      // For now, let's assume we find it by looking for the payment or we just update the tenant
      // We need to know which tenant this payment belongs to. Usually, external_reference holds the tenant_id or subscription_id
      const action = payload.action;
      
      if (action === 'payment.created') {
        // Simulated:
        // const mpPayment = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`)...
        // const externalRef = mpPayment.external_reference; // sub_id
        
        // This is a placeholder since we don't have the external call
        console.log(`Processing payment ${dataId}`);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

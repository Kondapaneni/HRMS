// A one-time, unguessable per-message capability is included by the database INSERT webhook.
// No client-supplied recipient, subject, or HTML is ever trusted.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseDeliveryEvent(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      payload.type !== 'INSERT' || payload.schema !== 'public' ||
      payload.table !== 'email_queue') return null;

  const record = payload.record;
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  if (typeof record.id !== 'string' || !UUID.test(record.id) ||
      typeof record.delivery_token !== 'string' || !UUID.test(record.delivery_token)) return null;

  return { id: record.id, token: record.delivery_token };
}

export function claimPendingEmail(client, { id, token }) {
  // The conditional UPDATE is atomic. A replay or concurrent request cannot send twice.
  return client.from('email_queue')
    .update({ status: 'processing' })
    .eq('id', id)
    .eq('delivery_token', token)
    .eq('status', 'pending')
    .select('id,to_email,subject,body')
    .maybeSingle();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryEvent, claimPendingEmail } from '../supabase/functions/send-email/auth.mjs';

const id = '550e8400-e29b-41d4-a716-446655440000';
const token = '82d48336-d7e5-40f7-b55a-16a2738c3cc5';
const good = { type: 'INSERT', table: 'email_queue', schema: 'public',
  record: { id, delivery_token: token, to_email: 'attacker@example.com', subject: 'forged', body: '<b>forged</b>' } };

test('valid database webhook returns only capability fields, never caller-supplied mail content', () => {
  assert.deepEqual(parseDeliveryEvent(good), { id, token });
});

test('rejects anonymous and forged requests with missing or malformed capability', () => {
  for (const payload of [null, {}, { record: good.record },
    { ...good, record: { id } },
    { ...good, record: { id, delivery_token: 'not-a-token' } },
    { ...good, record: { id: 'not-a-uuid', delivery_token: token } },
    { ...good, type: 'UPDATE' }, { ...good, table: 'users' },
    { ...good, schema: 'storage' }, { ...good, record: [] }]) {
    assert.equal(parseDeliveryEvent(payload), null);
  }
});

test('conditionally claims only the matching pending message; cannot replay', async () => {
  const clauses = [];
  const chain = {
    update: (value) => { clauses.push(['update', value]); return chain; },
    eq: (name, value) => { clauses.push(['eq', name, value]); return chain; },
    select: (value) => { clauses.push(['select', value]); return chain; },
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const client = { from: (name) => { clauses.push(['from', name]); return chain; } };
  const result = await claimPendingEmail(client, { id, token });
  assert.equal(result.data, null);
  assert.deepEqual(clauses, [
    ['from', 'email_queue'], ['update', { status: 'processing' }],
    ['eq', 'id', id], ['eq', 'delivery_token', token], ['eq', 'status', 'pending'],
    ['select', 'id,to_email,subject,body'],
  ]);
});

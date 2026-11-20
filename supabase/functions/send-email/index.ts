import nodemailer from 'npm:nodemailer';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseDeliveryEvent, claimPendingEmail } from './auth.mjs';
import { gmailCredentials, safeEmailFailure } from './diagnostics.mjs';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (req: Request) => {
  // This is a server-to-server webhook. It must never act as a public mail API.
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const event = parseDeliveryEvent(payload);
  if (!event) return json(401, { error: 'Unauthorized' });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json(503, { error: 'Email service unavailable' });

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let claimedId: string | null = null;
  let deliveryStage = 'claim';

  try {
    // Never use to_email, subject, or body from the untrusted HTTP payload.
    // The DB-generated delivery_token must match the pending queued record.
    const { data: email, error: claimError } = await claimPendingEmail(client, event);
    if (claimError) throw claimError;
    if (!email) return json(401, { error: 'Unauthorized' });
    claimedId = email.id;

    const { user, pass } = gmailCredentials(Deno.env);
    if (!user) {
      deliveryStage = 'gmail-user-missing';
      throw new Error('SMTP not configured');
    }
    if (!pass) {
      deliveryStage = 'gmail-app-password-missing';
      throw new Error('SMTP not configured');
    }
    if (!email.to_email || !email.subject || !email.body) {
      deliveryStage = 'message-invalid';
      throw new Error('Incomplete queued email');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    deliveryStage = 'smtp-send';
    await transporter.sendMail({
      from: user,
      to: email.to_email,
      subject: email.subject,
      html: email.body,
    });

    deliveryStage = 'queue-complete';
    const { error: doneError } = await client.from('email_queue')
      .update({ status: 'processed' })
      .eq('id', claimedId)
      .eq('status', 'processing');
    if (doneError) throw doneError;

    return json(200, { success: true, id: claimedId });
  } catch (error) {
    // Do not replace the queued email body with error details or leak SMTP credentials.
    if (claimedId) {
      const { error: markError } = await client.from('email_queue')
        .update({ status: 'failed' })
        .eq('id', claimedId)
        .eq('status', 'processing');
      if (markError) console.error('SEC-002: unable to mark email as failed');
    }
    console.error(safeEmailFailure(deliveryStage, error));
    return json(503, { error: 'Email delivery failed' });
  }
});

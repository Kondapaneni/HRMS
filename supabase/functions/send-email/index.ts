import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: { "Content-Type": "application/json" }, status: 405 });
  const expected = Deno.env.get("EMAIL_WEBHOOK_SECRET") ?? "";
  const supplied = req.headers.get("x-email-webhook-secret") ?? "";
  if (!expected || !constantTimeEqual(expected, supplied)) return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { "Content-Type": "application/json" }, status: expected ? 401 : 503 });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const gmail = Deno.env.get("GMAIL_USER") ?? "";
  const password = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
  if (!url || !key || !gmail || !password) return new Response(JSON.stringify({ error: "Email service unavailable" }), { headers: { "Content-Type": "application/json" }, status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let id: string | number | null = null;
  try {
    const payload = await req.json();
    id = payload?.record?.id ?? payload?.id ?? null;
    if (id === null || String(id).length > 128) return new Response(JSON.stringify({ error: "Invalid queue reference" }), { status: 400 });
    const { data, error } = await supabase.from("email_queue").select("id,to_email,subject,body,status").eq("id", id).maybeSingle();
    if (error || !data) return new Response(JSON.stringify({ error: "Queued email not found" }), { status: 404 });
    if (data.status === "processed") return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200 });
    if (!data.to_email || !data.subject || !data.body) {
      await supabase.from("email_queue").update({ status: "failed" }).eq("id", id);
      return new Response(JSON.stringify({ error: "Queued email is incomplete" }), { status: 422 });
    }
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmail, pass: password } });
    await transporter.sendMail({ from: gmail, to: data.to_email, subject: data.subject, html: data.body });
    const { error: cleanupError } = await supabase.from("email_queue").update({ status: "processed", body: "" }).eq("id", id);
    if (cleanupError) console.error("Email sent but queue body cleanup failed:", cleanupError.message);
    return new Response(JSON.stringify({ success: true, id }), { headers: { "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("send-email failed:", error instanceof Error ? error.message : "unknown error");
    if (id !== null) await supabase.from("email_queue").update({ status: "failed" }).eq("id", id);
    return new Response(JSON.stringify({ error: "Unable to process queued email" }), { headers: { "Content-Type": "application/json" }, status: 500 });
  }
});

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let recordId = null;
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      throw new Error("Invalid payload: no record found.");
    }
    
    if (!record.to_email || !record.subject || !record.body) {
      throw new Error("Invalid payload: missing email fields. " + JSON.stringify(record));
    }

    recordId = record.id;
    const { to_email, subject, body } = record;

    const user = Deno.env.get("GMAIL_USER");
    const pass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!user || !pass) {
      throw new Error("Gmail credentials not configured in Edge Function secrets.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: user,
      to: to_email,
      subject: subject,
      text: body,
    };

    await transporter.sendMail(mailOptions);

    if (recordId) {
      await supabaseClient.from("email_queue").update({ status: "processed" }).eq("id", recordId);
    }

    return new Response(JSON.stringify({ success: true, id: recordId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error.message);
    
    if (recordId) {
      await supabaseClient.from("email_queue").update({ 
         status: "failed", 
         body: error.message // Put the error message in the body so we can see what went wrong
      }).eq("id", recordId);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

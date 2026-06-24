// Creates a tenant and admin user after successful Auth sign-up.
// Called from the dashboard client after supabase.auth.signUp().

import { createClient } from "npm:@supabase/supabase-js@2";
import { slugify } from "../_shared/slugify.ts";

interface Payload {
  user_id: string;
  email: string;
  full_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { user_id, email, full_name }: Payload = await req.json();

  if (!user_id || !email) {
    return new Response(
      JSON.stringify({ error: "user_id and email are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Create tenant with trial status
  const slug = slugify(full_name || email.split("@")[0]);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: full_name || email.split("@")[0],
      slug,
      email,
      status: "trial",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (tenantError) {
    return new Response(JSON.stringify({ error: tenantError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Create public.users entry linked to the tenant
  const { error: userError } = await supabase.from("users").insert({
    id: user_id,
    tenant_id: tenant.id,
    role: "admin",
    full_name: full_name || null,
  });

  if (userError) {
    // Rollback tenant
    await supabase.from("tenants").delete().eq("id", tenant.id);
    return new Response(JSON.stringify({ error: userError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ tenant_id: tenant.id }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

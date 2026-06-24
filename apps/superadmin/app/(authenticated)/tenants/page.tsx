import { createAdminClient } from "@/lib/supabase/server";
import { TenantsTable } from "./TenantsTable";
import { TenantStatus, Plan, PaymentMethod } from "@onclick/types";

export const revalidate = 0;

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string; payment?: string }>;
}) {
  const supabase = createAdminClient();
  const params = await searchParams;

  let query = supabase
    .from("tenants")
    .select(`
      id, name, email, phone, status, created_at,
      subscriptions(plan, payment_method, current_period_end)
    `)
    .order("created_at", { ascending: false });

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,email.ilike.%${params.q}%`);
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  
  const { data: rawData, error } = await query;
  
  // Transform and filter related data (PostgREST doesn't support complex joined filtering easily out of the box)
  let tenants = (rawData || []).map(t => {
    const sub = Array.isArray(t.subscriptions) ? t.subscriptions[0] : t.subscriptions;
    return {
      ...t,
      plan: sub?.plan as Plan || null,
      payment_method: sub?.payment_method as PaymentMethod || null,
      current_period_end: sub?.current_period_end || null,
    };
  });

  if (params.plan && params.plan !== "all") {
    tenants = tenants.filter(t => t.plan === params.plan);
  }
  if (params.payment && params.payment !== "all") {
    tenants = tenants.filter(t => t.payment_method === params.payment);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
        <p className="text-muted-foreground mt-2">Administra los negocios registrados en la plataforma.</p>
      </div>

      <TenantsTable initialData={tenants} />
    </div>
  );
}

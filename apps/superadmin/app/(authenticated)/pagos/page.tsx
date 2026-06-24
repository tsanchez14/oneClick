import { createAdminClient } from "@/lib/supabase/server";
import { PaymentsTable } from "./PaymentsTable";

export const revalidate = 0;

export default async function PagosPage() {
  const supabase = createAdminClient();

  const { data: rawData, error } = await supabase
    .from("subscriptions")
    .select(`
      id, plan, status, current_period_end, payment_method,
      tenants(id, name, status),
      payment_history(paid_at)
    `)
    .eq("payment_method", "manual")
    .in("status", ["trial", "past_due", "pending_manual_payment"]);

  // Format data for the client
  const pendingPayments = (rawData || []).map(sub => {
    const tenant = Array.isArray(sub.tenants) ? sub.tenants[0] : sub.tenants;
    const history = Array.isArray(sub.payment_history) ? sub.payment_history : [];
    // Sort to get latest payment
    history.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    const lastPaymentDate = history[0]?.paid_at || null;

    return {
      subscriptionId: sub.id,
      tenantId: tenant?.id,
      tenantName: tenant?.name,
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      lastPaymentDate
    };
  }).filter(p => p.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pagos Manuales</h2>
        <p className="text-muted-foreground mt-2">Gestiona clientes que abonan mediante transferencia o efectivo y requieren activación manual.</p>
      </div>

      <PaymentsTable pendingPayments={pendingPayments} />
    </div>
  );
}

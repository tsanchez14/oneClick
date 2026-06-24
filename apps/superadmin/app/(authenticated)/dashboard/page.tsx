import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, UserCheck, UserX, DollarSign, Activity } from "lucide-react";

export const revalidate = 0; // Disable caching for the dashboard

export default async function DashboardPage() {
  const supabase = createAdminClient();

  // Fetch metrics in parallel
  const [
    { count: activeTenants },
    { count: trialTenants },
    { count: suspendedTenants },
    { data: latestTenants },
  ] = await Promise.all([
    supabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "trial"),
    supabase.from("tenants").select("*", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("tenants").select("id, name, email, status, created_at, subscriptions(plan)").order("created_at", { ascending: false }).limit(5),
  ]);

  // Fetch current month revenue
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: payments } = await supabase
    .from("payment_history")
    .select("amount")
    .eq("status", "paid")
    .gte("paid_at", startOfMonth.toISOString());

  const currentMonthRevenue = payments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

  const statCards = [
    { title: "Tenants Activos", value: activeTenants || 0, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "En Prueba", value: trialTenants || 0, icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Suspendidos", value: suspendedTenants || 0, icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "Ingresos del Mes", value: formatCurrency(currentMonthRevenue), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">Visión general del estado de los negocios en onClick.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="col-span-4 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Últimos Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto rounded-md border">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Negocio</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Registro</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {latestTenants?.map((tenant) => {
                  const plan = Array.isArray(tenant.subscriptions) ? tenant.subscriptions[0]?.plan : tenant.subscriptions?.plan;
                  return (
                    <tr key={tenant.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">{tenant.name}</td>
                      <td className="p-4 align-middle text-muted-foreground">{tenant.email || '-'}</td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase bg-secondary">
                          {plan || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          tenant.status === 'trial' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">{formatDate(tenant.created_at)}</td>
                    </tr>
                  )
                })}
                {(!latestTenants || latestTenants.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay registros recientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

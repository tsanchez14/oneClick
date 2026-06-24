import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TenantDetailsClient } from "./TenantDetailsClient";

export const revalidate = 0;

export default async function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient();
  const { id } = await params;

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select(`
      *,
      subscriptions(*),
      payment_history(*)
    `)
    .eq("id", id)
    .single();

  if (error || !tenant) {
    notFound();
  }

  const subscription = Array.isArray(tenant.subscriptions) ? tenant.subscriptions[0] : tenant.subscriptions;
  const history = Array.isArray(tenant.payment_history) ? tenant.payment_history : [];
  history.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{tenant.name}</h2>
          <p className="text-muted-foreground mt-1">ID: {tenant.id}</p>
        </div>
        <TenantDetailsClient 
          tenantId={tenant.id} 
          currentStatus={tenant.status} 
          currentPlan={subscription?.plan || 'base'} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Datos del Negocio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Email de contacto</span>
              <p className="font-medium">{tenant.email || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Teléfono</span>
              <p className="font-medium">{tenant.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Slug (URL)</span>
              <p className="font-medium">{tenant.slug}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Fecha de registro</span>
              <p className="font-medium">{formatDate(tenant.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Suscripción Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Estado</span>
              <div className="mt-1">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                  tenant.status === 'trial' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                  'bg-destructive/10 text-destructive border-destructive/20'
                }`}>
                  {tenant.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Plan</span>
              <p className="font-medium uppercase">{subscription?.plan || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Método de pago</span>
              <p className="font-medium capitalize">{subscription?.payment_method || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Vencimiento del período</span>
              <p className="font-medium">{subscription?.current_period_end ? formatDate(subscription.current_period_end) : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>Registro histórico de transacciones.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-md border-dashed">
              No hay pagos registrados para este tenant.
            </div>
          ) : (
            <div className="relative w-full overflow-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Monto</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Método</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nota</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {history.map((payment) => (
                    <tr key={payment.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle text-muted-foreground">
                        {payment.paid_at ? formatDate(payment.paid_at) : '-'}
                      </td>
                      <td className="p-4 align-middle font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="p-4 align-middle capitalize">{payment.method}</td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          payment.status === 'refunded' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

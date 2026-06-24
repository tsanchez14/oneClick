"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { registerManualPayment } from "./actions";
import { CheckCircle2, X } from "lucide-react";

export function PaymentsTable({ pendingPayments }: { pendingPayments: any[] }) {
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await registerManualPayment(formData);
      if (result?.error) {
        return { error: result.error, success: false };
      }
      return { success: true };
    },
    { error: "", success: false }
  );

  useEffect(() => {
    if (state?.success) {
      setSelectedPayment(null);
      // Reset state success silently so next time it works too
      state.success = false; 
    }
  }, [state?.success]);

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Negocio</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado Suscripción</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Último Pago</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Próximo Vencimiento</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-24 text-center text-muted-foreground">No hay pagos manuales pendientes.</td>
                  </tr>
                ) : (
                  pendingPayments.map((payment) => (
                    <tr key={payment.subscriptionId} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">{payment.tenantName}</td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase bg-secondary">
                          {payment.plan}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-500 capitalize">
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {payment.lastPaymentDate ? formatDate(payment.lastPaymentDate) : 'Nunca'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {payment.currentPeriodEnd ? formatDate(payment.currentPeriodEnd) : '-'}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedPayment(payment)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Registrar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg relative">
            <button 
              onClick={() => setSelectedPayment(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-semibold tracking-tight mb-2">Registrar Pago</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Registrar pago manual para <strong>{selectedPayment.tenantName}</strong>.
            </p>
            
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="tenantId" value={selectedPayment.tenantId} />
              <input type="hidden" name="subscriptionId" value={selectedPayment.subscriptionId} />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Monto (ARS)</label>
                <Input name="amount" type="number" min="0" required placeholder="0" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nota (Opcional)</label>
                <Input name="notes" placeholder="Ej: Transferencia Banco Galicia" />
              </div>

              {state?.error && (
                <div className="text-sm text-destructive font-medium">
                  {state.error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setSelectedPayment(null)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Registrando..." : "Confirmar Pago"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateTenantStatus } from "./actions";
import { formatDate } from "@/lib/utils";
import { Search, MoreVertical, Eye, Play, Pause } from "lucide-react";

export function TenantsTable({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [planFilter, setPlanFilter] = useState(searchParams.get("plan") || "all");
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get("payment") || "all");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (planFilter !== "all") params.set("plan", planFilter);
    if (paymentFilter !== "all") params.set("payment", paymentFilter);
    router.push(`/tenants?${params.toString()}`);
  };

  const handleAction = async (id: string, action: "active" | "suspended") => {
    if (confirm(`¿Estás seguro de que deseas ${action === 'active' ? 'habilitar' : 'suspender'} este tenant?`)) {
      startTransition(async () => {
        await updateTenantStatus(id, action);
      });
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="p-4 border-b space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="flex h-9 w-[150px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all" className="bg-background">Todos los estados</option>
              <option value="trial" className="bg-background">Trial</option>
              <option value="active" className="bg-background">Activo</option>
              <option value="suspended" className="bg-background">Suspendido</option>
              <option value="cancelled" className="bg-background">Cancelado</option>
            </select>
            
            <select 
              className="flex h-9 w-[150px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all" className="bg-background">Todos los planes</option>
              <option value="base" className="bg-background">Base</option>
              <option value="pro" className="bg-background">Pro</option>
              <option value="premium" className="bg-background">Premium</option>
            </select>
            
            <select 
              className="flex h-9 w-[150px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all" className="bg-background">Todos los métodos</option>
              <option value="mercadopago" className="bg-background">MercadoPago</option>
              <option value="manual" className="bg-background">Manual</option>
            </select>

            <Button onClick={applyFilters} variant="secondary">Filtrar</Button>
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email / Tel</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Método Pago</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vencimiento</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-muted-foreground">No se encontraron resultados.</td>
                </tr>
              ) : (
                initialData.map((tenant) => (
                  <tr key={tenant.id} className={`border-b transition-colors hover:bg-muted/50 ${isPending ? 'opacity-50' : ''}`}>
                    <td className="p-4 align-middle font-medium">{tenant.name}</td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span>{tenant.email || '-'}</span>
                        <span className="text-xs text-muted-foreground">{tenant.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase bg-secondary">
                        {tenant.plan || 'N/A'}
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
                    <td className="p-4 align-middle capitalize">{tenant.payment_method || '-'}</td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {tenant.current_period_end ? formatDate(tenant.current_period_end) : '-'}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="icon" title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {tenant.status === 'suspended' ? (
                          <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => handleAction(tenant.id, "active")} title="Habilitar">
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (tenant.status === 'active' || tenant.status === 'trial') ? (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction(tenant.id, "suspended")} title="Suspender">
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

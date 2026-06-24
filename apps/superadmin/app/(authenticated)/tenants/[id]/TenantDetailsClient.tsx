"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updatePlan, updateStatus, deleteTenant } from "./actions";
import { Plan } from "@onclick/types";
import { ChevronDown, Play, Pause, Trash2, ShieldAlert } from "lucide-react";

export function TenantDetailsClient({
  tenantId,
  currentStatus,
  currentPlan
}: {
  tenantId: string;
  currentStatus: string;
  currentPlan: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handlePlanChange = (plan: Plan) => {
    setShowPlanDropdown(false);
    startTransition(async () => {
      await updatePlan(tenantId, plan);
    });
  };

  const handleStatusChange = (status: "active" | "suspended") => {
    if (confirm(`¿Estás seguro de que deseas ${status === 'active' ? 'habilitar' : 'suspender'} este tenant?`)) {
      startTransition(async () => {
        await updateStatus(tenantId, status);
      });
    }
  };

  const handleDelete = () => {
    if (deleteInput !== "ELIMINAR") return;
    startTransition(async () => {
      await deleteTenant(tenantId);
    });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Plan Dropdown */}
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setShowPlanDropdown(!showPlanDropdown)}
          disabled={isPending}
        >
          Plan: <span className="uppercase ml-1 font-bold">{currentPlan}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>

        {showPlanDropdown && (
          <div className="absolute top-full right-0 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md z-10">
            {["base", "pro", "premium"].map((plan) => (
              <button
                key={plan}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground capitalize"
                onClick={() => handlePlanChange(plan as Plan)}
              >
                {plan}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Action */}
      {currentStatus === 'suspended' ? (
        <Button
          className="bg-emerald-500 text-white hover:bg-emerald-600"
          disabled={isPending}
          onClick={() => handleStatusChange("active")}
        >
          <Play className="mr-2 h-4 w-4" /> Habilitar
        </Button>
      ) : (currentStatus === 'active' || currentStatus === 'trial') ? (
        <Button
          variant="secondary"
          className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
          disabled={isPending}
          onClick={() => handleStatusChange("suspended")}
        >
          <Pause className="mr-2 h-4 w-4" /> Suspender
        </Button>
      ) : null}

      {/* Delete Action */}
      <Button
        variant="destructive"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
      </Button>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-destructive bg-card p-6 shadow-lg relative">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-bold tracking-tight">Peligro: Eliminar Tenant</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente todos los datos de este negocio, incluyendo profesionales, clientes, servicios y turnos.
            </p>
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium">Escribe "ELIMINAR" para confirmar</label>
              <input
                className="flex h-9 w-full rounded-md border border-destructive/50 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="ELIMINAR"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteInput !== "ELIMINAR" || isPending}
                onClick={handleDelete}
              >
                {isPending ? "Eliminando..." : "Eliminar Permanentemente"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

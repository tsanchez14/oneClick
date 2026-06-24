"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registerManualPayment(formData: FormData) {
  const tenantId = formData.get("tenantId") as string;
  const subscriptionId = formData.get("subscriptionId") as string;
  const amount = Number(formData.get("amount"));
  const notes = formData.get("notes") as string;
  
  if (!tenantId || !subscriptionId || isNaN(amount)) {
    return { error: "Datos inválidos" };
  }

  const supabase = createAdminClient();
  
  // 1. Insert payment history
  const { error: insertError } = await supabase.from("payment_history").insert({
    tenant_id: tenantId,
    subscription_id: subscriptionId,
    amount,
    method: "manual",
    status: "paid",
    paid_at: new Date().toISOString(),
    notes: notes || null
  });

  if (insertError) return { error: "Error guardando historial: " + insertError.message };

  // 2. Calculate new period end (+30 days from now)
  const newPeriodEnd = new Date();
  newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

  // 3. Update subscription
  const { error: subError } = await supabase.from("subscriptions")
    .update({ 
      status: "active", 
      current_period_end: newPeriodEnd.toISOString() 
    })
    .eq("id", subscriptionId);
    
  if (subError) return { error: "Error actualizando suscripción: " + subError.message };

  // 4. Update tenant status
  const { error: tenantError } = await supabase.from("tenants")
    .update({ status: "active" })
    .eq("id", tenantId);
    
  if (tenantError) return { error: "Error actualizando tenant: " + tenantError.message };

  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");
  return { success: true };
}

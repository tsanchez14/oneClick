"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plan } from "@onclick/types";

export async function updatePlan(tenantId: string, newPlan: Plan) {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("subscriptions")
    .update({ plan: newPlan })
    .eq("tenant_id", tenantId);
    
  if (error) return { error: error.message };
  
  revalidatePath(`/tenants/${tenantId}`);
  return { success: true };
}

export async function updateStatus(tenantId: string, newStatus: "active" | "suspended") {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("tenants")
    .update({ status: newStatus })
    .eq("id", tenantId);
    
  if (error) return { error: error.message };
  
  revalidatePath(`/tenants/${tenantId}`);
  return { success: true };
}

export async function deleteTenant(tenantId: string) {
  const supabase = createAdminClient();
  
  // Supposing cascading deletes are configured in Supabase.
  // If not, we would need to delete related records first.
  const { error } = await supabase
    .from("tenants")
    .delete()
    .eq("id", tenantId);
    
  if (error) return { error: error.message };
  
  redirect("/tenants");
}

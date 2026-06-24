"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateTenantStatus(id: string, status: "active" | "suspended") {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("tenants")
    .update({ status })
    .eq("id", id);
    
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath("/tenants");
  return { success: true };
}

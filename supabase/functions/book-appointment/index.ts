// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// We create a singleton connection pool using the SUPABASE_DB_URL environment variable
const pool = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 5 });

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      tenant_id, 
      professional_id, 
      service_id, 
      client_name, 
      client_phone, 
      starts_at, 
      ends_at, 
      booked_from 
    } = body;

    if (!tenant_id || !professional_id || !service_id || !client_name || !client_phone || !starts_at || !ends_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const start = new Date(starts_at);
    const end = new Date(ends_at);

    if (start >= end) {
      return new Response(
        JSON.stringify({ error: "starts_at must be before ends_at" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start a transaction
    const appointmentId = await pool.begin(async (sql) => {
      // 1. Lock the professional row to serialize bookings for this professional
      // This prevents race conditions where two concurrent requests check availability and both find it available.
      await sql`
        SELECT id FROM professionals
        WHERE id = ${professional_id} AND tenant_id = ${tenant_id}
        FOR UPDATE
      `;

      // 2. Check for overlapping appointments
      // status != 'cancelled'
      const overlaps = await sql`
        SELECT id FROM appointments
        WHERE professional_id = ${professional_id}
        AND status IN ('confirmed', 'blocked')
        AND starts_at < ${end.toISOString()}
        AND ends_at > ${start.toISOString()}
      `;

      if (overlaps.length > 0) {
        throw new Error("El profesional ya tiene un turno reservado en ese horario.");
      }

      // 3. Check for overlapping time blocks
      const blocks = await sql`
        SELECT id FROM time_blocks
        WHERE professional_id = ${professional_id}
        AND starts_at < ${end.toISOString()}
        AND ends_at > ${start.toISOString()}
      `;

      if (blocks.length > 0) {
        throw new Error("El profesional no está disponible en ese horario.");
      }

      // 4. Upsert the client
      const [client] = await sql`
        INSERT INTO clients (tenant_id, full_name, phone)
        VALUES (${tenant_id}, ${client_name}, ${client_phone})
        ON CONFLICT (tenant_id, phone) 
        DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id
      `;

      // 5. Insert the appointment
      const [appointment] = await sql`
        INSERT INTO appointments (
          tenant_id, professional_id, service_id, client_id, 
          starts_at, ends_at, status, booked_from
        ) VALUES (
          ${tenant_id}, ${professional_id}, ${service_id}, ${client.id},
          ${start.toISOString()}, ${end.toISOString()}, 'confirmed', ${booked_from || 'public_url'}
        )
        RETURNING id
      `;

      return appointment.id;
    });

    return new Response(
      JSON.stringify({ success: true, appointment_id: appointmentId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Booking error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import type { ScheduledEvent } from '@cloudflare/workers-types';
import { Env } from './types';
import { getSupabase } from './supabase';

export async function handleCron(event: ScheduledEvent, env: Env) {
  const supabase = getSupabase(env);
  const now = new Date().toISOString();

  switch (event.cron) {
    case '0 0 * * *': {
      // Job 1: Suspender trials vencidos (Diario a las 00:00 UTC)
      const { data: expiredTrials } = await supabase
        .from('tenants')
        .select('id')
        .eq('status', 'trial')
        .lt('trial_ends_at', now);

      if (expiredTrials && expiredTrials.length > 0) {
        const ids = expiredTrials.map(t => t.id);
        const { error } = await supabase
          .from('tenants')
          .update({ status: 'suspended' })
          .in('id', ids);
          
        console.log(`Suspendidos ${ids.length} tenants con trial vencido.`, error ? error : '');
      } else {
        console.log('No hay trials vencidos para suspender.');
      }
      break;
    }

    case '*/15 * * * *': {
      // Job 2: Recordatorios de WhatsApp (Cada 15 min)
      // Buscamos turnos (appointments) confirmados y no enviados.
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, starts_at, tenant_id, client_id,
          tenants!inner(name)
        `)
        .eq('status', 'confirmed')
        .eq('whatsapp_sent', false);

      if (appointments && appointments.length > 0) {
        const nowMs = Date.now();
        let sentCount = 0;

        for (const appt of appointments) {
          // Asumimos un reminder de 2 horas (120 minutos) fijo para la prueba,
          // ya que no hay tabla de configuraciones en el schema dado por ahora.
          const reminderMinutes = 120; 
          const apptTimeMs = new Date(appt.starts_at).getTime();
          
          const timeDiffMinutes = (apptTimeMs - nowMs) / 1000 / 60;
          
          // Si el turno es dentro de (reminderMinutes - 5) y (reminderMinutes + 5)
          if (timeDiffMinutes >= (reminderMinutes - 5) && timeDiffMinutes <= (reminderMinutes + 5)) {
            
            // Llamada a Meta Cloud API simulada
            console.log(`Enviando recordatorio para turno ${appt.id} del tenant ${appt.tenant_id}`);
            /*
            await fetch(`https://graph.facebook.com/v17.0/${env.WHATSAPP_PHONE_ID}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ ... })
            });
            */
            
            // Actualizar DB
            await supabase
              .from('appointments')
              .update({ whatsapp_sent: true })
              .eq('id', appt.id);
              
            sentCount++;
          }
        }
        console.log(`Enviados ${sentCount} recordatorios de WhatsApp.`);
      }
      break;
    }

    case '0 8 * * *': {
      // Job 3: Alertar pagos manuales vencidos (Diario a las 08:00 UTC)
      // Buscamos suscripciones con pago manual vencidas
      const { data: pastDueSubs } = await supabase
        .from('subscriptions')
        .select('tenant_id')
        .eq('payment_method', 'manual')
        .eq('status', 'active')
        .lt('current_period_end', now);

      if (pastDueSubs && pastDueSubs.length > 0) {
        const tenantIds = pastDueSubs.map(s => s.tenant_id);
        
        // Pasamos la suscripción a past_due
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .in('tenant_id', tenantIds);

        // Y al tenant
        await supabase
          .from('tenants')
          .update({ status: 'past_due' })
          .in('id', tenantIds);

        console.log(`Marcados ${tenantIds.length} tenants y suscripciones como past_due por pago manual vencido.`);
      }
      break;
    }
  }
}

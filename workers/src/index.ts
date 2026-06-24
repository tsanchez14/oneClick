import type { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { Env } from './types';
import { handleWebhook } from './webhook';
import { handleCron } from './cron';

export default {
  // Manejador para llamadas HTTP (Webhook)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Solo escuchamos la ruta de mercadopago
    if (request.method === 'POST' && url.pathname === '/webhooks/mercadopago') {
      return await handleWebhook(request, env);
    }

    return new Response('Not found', { status: 404 });
  },

  // Manejador para tareas programadas (Crons)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(event, env));
  }
};

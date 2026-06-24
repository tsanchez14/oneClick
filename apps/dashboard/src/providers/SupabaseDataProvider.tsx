import React from 'react';
import { supabase } from '@onclick/utils';
import { DataContext, DataProvider } from '../contexts/DataContext';

export function SupabaseDataProvider({ children }: { children: React.ReactNode }) {
  const provider: DataProvider = {
    async getTenant(slug) {
      const { data } = await supabase.from('tenants').select('*').eq('slug', slug).single();
      return data;
    },
    async getTenantById(id) {
      const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
      return data;
    },
    
    async getServices(tenantId) {
      const { data } = await supabase.from('services').select('*').eq('tenant_id', tenantId).order('is_active', { ascending: false }).order('name');
      return data || [];
    },
    async getActiveServices(tenantId) {
      const { data } = await supabase.from('services').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name');
      return data || [];
    },
    async createService(service) {
      const { data } = await supabase.from('services').insert([service]).select().single();
      return data;
    },
    async updateService(id, updates) {
      const { data } = await supabase.from('services').update(updates).eq('id', id).select().single();
      return data;
    },
    async deleteService(id) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      return !error;
    },

    async getProfessionals(tenantId) {
      const { data } = await supabase.from('professionals').select('*, users(avatar_url)').eq('tenant_id', tenantId).order('is_available', { ascending: false }).order('display_name');
      return data || [];
    },
    async getActiveProfessionals(tenantId) {
      const { data } = await supabase.from('professionals').select('*, users(avatar_url)').eq('tenant_id', tenantId).eq('is_available', true).order('display_name');
      return data || [];
    },
    async createProfessional(prof) {
      const { data } = await supabase.from('professionals').insert([prof]).select().single();
      return data;
    },
    async updateProfessional(id, updates) {
      const { data } = await supabase.from('professionals').update(updates).eq('id', id).select().single();
      return data;
    },
    async deleteProfessional(id) {
      const { error } = await supabase.from('professionals').delete().eq('id', id);
      return !error;
    },

    async getAppointments(tenantId, start, end) {
      const { data } = await supabase.from('appointments').select(`
        *,
        clients(*),
        professionals(*),
        services(*)
      `).eq('tenant_id', tenantId).gte('starts_at', start).lte('starts_at', end);
      return data || [];
    },
    async getAppointmentsForProfessional(tenantId, professionalId, start, end) {
      const { data } = await supabase.from('appointments').select('*').eq('tenant_id', tenantId).eq('professional_id', professionalId).in('status', ['confirmed', 'blocked']).gte('starts_at', start).lte('starts_at', end);
      return data || [];
    },
    async createAppointment(appt) {
      const { data } = await supabase.from('appointments').insert([appt]).select().single();
      return data;
    },
    async updateAppointment(id, updates) {
      const { data } = await supabase.from('appointments').update(updates).eq('id', id).select().single();
      return data;
    },
    async deleteAppointment(id) {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      return !error;
    },
    async checkFutureAppointments(column, value) {
      const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq(column, value).gte('starts_at', new Date().toISOString());
      return (count ?? 0) > 0;
    },

    async getTimeBlocks(tenantId, start, end) {
      const { data } = await supabase.from('time_blocks').select('*').eq('tenant_id', tenantId).gte('starts_at', start).lte('starts_at', end);
      return data || [];
    },
    async getTimeBlocksForProfessional(tenantId, professionalId, start, end) {
      const { data } = await supabase.from('time_blocks').select('*').eq('tenant_id', tenantId).eq('professional_id', professionalId).gte('starts_at', start).lte('starts_at', end);
      return data || [];
    },
    async createTimeBlock(block) {
      const { data } = await supabase.from('time_blocks').insert([block]).select().single();
      return data;
    },
    async deleteTimeBlock(id) {
      const { error } = await supabase.from('time_blocks').delete().eq('id', id);
      return !error;
    },

    async getClients(tenantId) {
      const { data } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).order('full_name');
      return data || [];
    },
    async getClientByPhone(tenantId, phone) {
      const { data } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).eq('phone', phone).single();
      return data;
    },
    async searchClients(tenantId, query) {
      const { data } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(8);
      return data || [];
    },
    async upsertClient(tenantId, phone, fullName) {
      const { data } = await supabase.from('clients').upsert([{ tenant_id: tenantId, phone, full_name: fullName }], { onConflict: 'tenant_id,phone' }).select().single();
      return data;
    },
    async getSubscription(tenantId) {
      const { data } = await supabase.from('subscriptions').select('*').eq('tenant_id', tenantId).maybeSingle();
      return data;
    },
    async createInvitation(tenantId, email, token, expiresAt) {
      const { data } = await supabase.from('invitations').insert({ tenant_id: tenantId, email: email || null, token, expires_at: expiresAt }).select().single();
      return data;
    }
  };

  return <DataContext.Provider value={provider}>{children}</DataContext.Provider>;
}

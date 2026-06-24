import React from 'react';
import { DataContext, DataProvider } from '../contexts/DataContext';
import { useDemoState } from '../contexts/DemoContext';

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const { tenant, services, professionals, appointments, timeBlocks, clients, setState } = useDemoState();

  const provider: DataProvider = {
    async getTenant(slug) {
      return tenant.slug === slug ? tenant : null;
    },
    async getTenantById(id) {
      return tenant.id === id ? tenant : null;
    },
    
    async getServices() {
      return [...services].sort((a, b) => a.name.localeCompare(b.name)).sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
    },
    async getActiveServices() {
      return services.filter(s => s.is_active).sort((a, b) => a.name.localeCompare(b.name));
    },
    async createService(svc) {
      const newSvc = { ...svc, id: `svc-${Date.now()}` } as any;
      setState(prev => ({ ...prev, services: [...prev.services, newSvc] }));
      return newSvc;
    },
    async updateService(id, updates) {
      let updatedSvc = null;
      setState(prev => ({
        ...prev,
        services: prev.services.map(s => {
          if (s.id === id) {
            updatedSvc = { ...s, ...updates };
            return updatedSvc;
          }
          return s;
        })
      }));
      return updatedSvc;
    },
    async deleteService(id) {
      setState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
      return true;
    },

    async getProfessionals() {
      return [...professionals].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '')).sort((a, b) => (a.is_available === b.is_available ? 0 : a.is_available ? -1 : 1));
    },
    async getActiveProfessionals() {
      return professionals.filter(p => p.is_available).sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
    },
    async createProfessional(prof) {
      const newProf = { ...prof, id: `prof-${Date.now()}` } as any;
      setState(prev => ({ ...prev, professionals: [...prev.professionals, newProf] }));
      return newProf;
    },
    async updateProfessional(id, updates) {
      let updatedProf = null;
      setState(prev => ({
        ...prev,
        professionals: prev.professionals.map(p => {
          if (p.id === id) {
            updatedProf = { ...p, ...updates };
            return updatedProf;
          }
          return p;
        })
      }));
      return updatedProf;
    },
    async deleteProfessional(id) {
      setState(prev => ({ ...prev, professionals: prev.professionals.filter(p => p.id !== id) }));
      return true;
    },

    async getAppointments(tenantId, start, end) {
      void tenantId;
      return appointments
        .filter(a => a.starts_at >= start && a.starts_at <= end)
        .map(a => ({
          ...a,
          clients: clients.find(c => c.id === a.client_id),
          professionals: professionals.find(p => p.id === a.professional_id),
          services: services.find(s => s.id === a.service_id)
        }));
    },
    async getAppointmentsForProfessional(tenantId, professionalId, start, end) {
      void tenantId;
      return appointments.filter(a => a.professional_id === professionalId && ['confirmed', 'blocked'].includes(a.status) && a.starts_at >= start && a.starts_at <= end);
    },
    async createAppointment(appt) {
      const newAppt = { ...appt, id: `appt-${Date.now()}`, created_at: new Date().toISOString() } as any;
      setState(prev => ({ ...prev, appointments: [...prev.appointments, newAppt] }));
      return newAppt;
    },
    async updateAppointment(id, updates) {
      let updatedAppt = null;
      setState(prev => ({
        ...prev,
        appointments: prev.appointments.map(a => {
          if (a.id === id) {
            updatedAppt = { ...a, ...updates };
            return updatedAppt;
          }
          return a;
        })
      }));
      return updatedAppt;
    },
    async deleteAppointment(id) {
      setState(prev => ({ ...prev, appointments: prev.appointments.filter(a => a.id !== id) }));
      return true;
    },
    async checkFutureAppointments(column, value) {
      const now = new Date().toISOString();
      return appointments.some(a => (a as any)[column] === value && a.starts_at >= now);
    },

    async getTimeBlocks(tenantId, start, end) {
      void tenantId;
      return timeBlocks.filter(b => b.starts_at >= start && b.starts_at <= end);
    },
    async getTimeBlocksForProfessional(tenantId, professionalId, start, end) {
      void tenantId;
      return timeBlocks.filter(b => b.professional_id === professionalId && b.starts_at >= start && b.starts_at <= end);
    },
    async createTimeBlock(block) {
      const newBlock = { ...block, id: `tb-${Date.now()}` } as any;
      setState(prev => ({ ...prev, timeBlocks: [...prev.timeBlocks, newBlock] }));
      return newBlock;
    },
    async deleteTimeBlock(id) {
      setState(prev => ({ ...prev, timeBlocks: prev.timeBlocks.filter(b => b.id !== id) }));
      return true;
    },

    async getClients() {
      return [...clients].sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
    async getClientByPhone(tenantId, phone) {
      void tenantId;
      return clients.find(c => c.phone === phone) || null;
    },
    async searchClients(tenantId, query) {
      void tenantId;
      const q = query.toLowerCase();
      return clients.filter(c => c.full_name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8);
    },
    async upsertClient(tenantId, phone, fullName) {
      let existing = clients.find(c => c.phone === phone);
      if (existing) {
        setState(prev => ({
          ...prev,
          clients: prev.clients.map(c => c.id === existing!.id ? { ...c, full_name: fullName } : c)
        }));
        return { ...existing, full_name: fullName };
      } else {
        const newClient = {
          id: `cli-${Date.now()}`,
          tenant_id: tenantId,
          full_name: fullName,
          phone,
          created_at: new Date().toISOString()
        };
        setState(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
        return newClient;
      }
    },
    async getSubscription(tenantId) {
      return {
        id: 'demo-sub',
        tenant_id: tenantId,
        plan: 'premium',
        status: 'active',
        payment_method: 'manual',
        mp_subscription_id: null,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        promo_ends_at: null,
        created_at: new Date().toISOString()
      };
    },
    async createInvitation(tenantId, email, token, expiresAt) {
      // Just simulate success in demo
      return {
        id: `inv-${Date.now()}`,
        tenant_id: tenantId,
        token,
        email: email || null,
        expires_at: expiresAt,
        used_at: null,
        created_by: 'demo'
      };
    }
  };

  return <DataContext.Provider value={provider}>{children}</DataContext.Provider>;
}

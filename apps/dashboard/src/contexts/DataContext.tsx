import { createContext, useContext } from 'react';
import type { Tenant, Service, Professional, Appointment, TimeBlock, Client, Subscription, Invitation } from '@onclick/types';

export interface DataProvider {
  // Tenant
  getTenant: (slug: string) => Promise<Tenant | null>;
  getTenantById: (id: string) => Promise<Tenant | null>;

  // Services
  getServices: (tenantId: string) => Promise<Service[]>;
  getActiveServices: (tenantId: string) => Promise<Service[]>;
  createService: (service: Partial<Service>) => Promise<Service | null>;
  updateService: (id: string, updates: Partial<Service>) => Promise<Service | null>;
  deleteService: (id: string) => Promise<boolean>;

  // Professionals
  getProfessionals: (tenantId: string) => Promise<(Professional & { users?: { avatar_url?: string | null } })[]>;
  getActiveProfessionals: (tenantId: string) => Promise<(Professional & { users?: { avatar_url?: string | null } })[]>;
  createProfessional: (prof: Partial<Professional>) => Promise<Professional | null>;
  updateProfessional: (id: string, updates: Partial<Professional>) => Promise<Professional | null>;
  deleteProfessional: (id: string) => Promise<boolean>;

  // Appointments
  getAppointments: (tenantId: string, start: string, end: string) => Promise<(Appointment & { clients?: Client, professionals?: Professional, services?: Service })[]>;
  getAppointmentsForProfessional: (tenantId: string, professionalId: string, start: string, end: string) => Promise<Appointment[]>;
  createAppointment: (appt: Partial<Appointment>) => Promise<Appointment | null>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<Appointment | null>;
  deleteAppointment: (id: string) => Promise<boolean>;
  checkFutureAppointments: (column: string, value: string) => Promise<boolean>;

  // TimeBlocks
  getTimeBlocks: (tenantId: string, start: string, end: string) => Promise<TimeBlock[]>;
  getTimeBlocksForProfessional: (tenantId: string, professionalId: string, start: string, end: string) => Promise<TimeBlock[]>;
  createTimeBlock: (block: Partial<TimeBlock>) => Promise<TimeBlock | null>;
  deleteTimeBlock: (id: string) => Promise<boolean>;

  // Clients
  getClients: (tenantId: string) => Promise<Client[]>;
  getClientByPhone: (tenantId: string, phone: string) => Promise<Client | null>;
  searchClients: (tenantId: string, query: string) => Promise<Client[]>;
  upsertClient: (tenantId: string, phone: string, fullName: string) => Promise<Client | null>;

  // Misc
  getSubscription: (tenantId: string) => Promise<Subscription | null>;
  createInvitation: (tenantId: string, email: string, token: string, expiresAt: string) => Promise<Invitation | null>;
}

export const DataContext = createContext<DataProvider | null>(null);

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider implementation');
  }
  return context;
}

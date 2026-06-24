import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Tenant, Service, Professional, Appointment, TimeBlock, Client } from '@onclick/types';

interface DemoState {
  tenant: Tenant;
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  clients: Client[];
}

interface DemoContextType extends DemoState {
  setState: React.Dispatch<React.SetStateAction<DemoState>>;
  reset: () => void;
}

export const DemoContext = createContext<DemoContextType | null>(null);

const DEMO_TENANT_ID = 'demo-tenant';

const initialTenant: Tenant = {
  id: DEMO_TENANT_ID,
  name: 'Barber Shop Demo',
  slug: 'demo',
  logo_url: null,
  status: 'active',
  working_days: [1, 2, 3, 4, 5, 6],
  open_time: '09:00',
  close_time: '19:00',
  phone: '1123456789',
  email: 'demo@barbershop.com',
  trial_ends_at: null,
  created_at: new Date().toISOString()
};

const initialServices: Service[] = [
  { id: 'svc-1', tenant_id: DEMO_TENANT_ID, name: 'Corte de cabello', duration_slots: 2, price: 8000, color: '#3B82F6', is_active: true },
  { id: 'svc-2', tenant_id: DEMO_TENANT_ID, name: 'Barba', duration_slots: 1, price: 5000, color: '#10B981', is_active: true },
  { id: 'svc-3', tenant_id: DEMO_TENANT_ID, name: 'Corte + Barba', duration_slots: 3, price: 12000, color: '#8B5CF6', is_active: true }
];

const initialProfessionals: Professional[] = [
  { id: 'prof-1', tenant_id: DEMO_TENANT_ID, user_id: 'user-1', display_name: 'Carlos Gómez', specialty: 'Barbero Principal', is_available: true },
  { id: 'prof-2', tenant_id: DEMO_TENANT_ID, user_id: 'user-2', display_name: 'Lucía Fernández', specialty: 'Estilista', is_available: true }
];

const initialClients: Client[] = [
  { id: 'cli-1', tenant_id: DEMO_TENANT_ID, full_name: 'Juan Pérez', phone: '1155551234', created_at: new Date().toISOString() },
  { id: 'cli-2', tenant_id: DEMO_TENANT_ID, full_name: 'Martín Rodríguez', phone: '1155555678', created_at: new Date().toISOString() }
];

function generateInitialAppointments(): Appointment[] {
  const appts: Appointment[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0-6
  const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diffToMonday));
  monday.setHours(0,0,0,0);

  // Generate 8 mock appointments throughout the week
  const slots = [
    { dayOffset: 0, hour: 10, min: 0, svc: 0, prof: 0, cli: 0 },
    { dayOffset: 0, hour: 15, min: 30, svc: 1, prof: 1, cli: 1 },
    { dayOffset: 1, hour: 11, min: 0, svc: 2, prof: 0, cli: 0 },
    { dayOffset: 1, hour: 16, min: 0, svc: 0, prof: 1, cli: 1 },
    { dayOffset: 2, hour: 9, min: 30, svc: 1, prof: 0, cli: 0 },
    { dayOffset: 2, hour: 17, min: 0, svc: 2, prof: 1, cli: 1 },
    { dayOffset: 3, hour: 13, min: 0, svc: 0, prof: 0, cli: 0 },
    { dayOffset: 4, hour: 10, min: 0, svc: 2, prof: 1, cli: 1 },
  ];

  slots.forEach((s, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + s.dayOffset);
    d.setHours(s.hour, s.min, 0, 0);

    const end = new Date(d);
    end.setMinutes(end.getMinutes() + initialServices[s.svc].duration_slots * 15);

    appts.push({
      id: `appt-${i}`,
      tenant_id: DEMO_TENANT_ID,
      professional_id: initialProfessionals[s.prof].id,
      service_id: initialServices[s.svc].id,
      client_id: initialClients[s.cli].id,
      starts_at: d.toISOString(),
      ends_at: end.toISOString(),
      status: 'confirmed',
      notes: null,
      booked_from: 'system',
      whatsapp_sent: false,
      created_at: new Date().toISOString()
    });
  });

  return appts;
}

const getInitialState = (): DemoState => ({
  tenant: initialTenant,
  services: initialServices,
  professionals: initialProfessionals,
  appointments: generateInitialAppointments(),
  timeBlocks: [],
  clients: initialClients
});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(getInitialState());

  const reset = useCallback(() => {
    setState(getInitialState());
  }, []);

  // Reset on mount
  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <DemoContext.Provider value={{ ...state, setState, reset }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoState() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoState must be used inside DemoProvider');
  return ctx;
}

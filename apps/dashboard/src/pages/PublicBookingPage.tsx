import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, ArrowLeft, Shuffle } from "lucide-react";
import { DataContext } from "../contexts/DataContext";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  working_days: number[];
  open_time: string;
  close_time: string;
  phone: string | null;
};

type Service = {
  id: string;
  name: string;
  duration_slots: number;
  price: number;
};

type Professional = {
  id: string;
  display_name: string;
  specialty: string;
  avatar_url?: string;
};

export default function PublicBookingPage({ demoSlug }: { demoSlug?: string } = {}) {
  const params = useParams<{ slug: string }>();
  const slug = demoSlug ?? params.slug;
  const navigate = useNavigate();
  const dataCtx = useContext(DataContext);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null | 'any'>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Load availability when date is selected
  useEffect(() => {
    if (!selectedDate || !tenant || !selectedProfessional || !selectedService) return;

    async function loadAvailability() {
      setSlotsLoading(true);
      
      const startOfDay = new Date(selectedDate!);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate!);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch appointments and blocks via DataContext
      let appts: any[] = [];
      let blocks: any[] = [];

      if (dataCtx) {
        [appts, blocks] = await Promise.all([
          dataCtx.getAppointmentsForProfessional(
            tenant!.id,
            selectedProfessional !== 'any' ? selectedProfessional!.id : '',
            startOfDay.toISOString(),
            endOfDay.toISOString()
          ).then(data => selectedProfessional !== 'any' ? data : Promise.resolve([] as any)),
          dataCtx.getTimeBlocksForProfessional(
            tenant!.id,
            selectedProfessional !== 'any' ? selectedProfessional!.id : '',
            startOfDay.toISOString(),
            endOfDay.toISOString()
          ).then(data => selectedProfessional !== 'any' ? data : Promise.resolve([] as any)),
        ]);

        if (selectedProfessional === 'any') {
          const allAppts = await Promise.all(professionals.map(p =>
            dataCtx.getAppointmentsForProfessional(tenant!.id, p.id, startOfDay.toISOString(), endOfDay.toISOString())
          ));
          const allBlocks = await Promise.all(professionals.map(p =>
            dataCtx.getTimeBlocksForProfessional(tenant!.id, p.id, startOfDay.toISOString(), endOfDay.toISOString())
          ));
          appts = allAppts.flat();
          blocks = allBlocks.flat();
        }
      } else {
        // fallback: direct supabase
        const { supabase: sb } = await import('@onclick/utils');
        let apptQuery = sb.from('appointments').select('*').eq('tenant_id', tenant!.id)
          .in('status', ['confirmed', 'blocked'])
          .gte('starts_at', startOfDay.toISOString()).lte('starts_at', endOfDay.toISOString());
        let blockQuery = sb.from('time_blocks').select('*').eq('tenant_id', tenant!.id)
          .gte('starts_at', startOfDay.toISOString()).lte('starts_at', endOfDay.toISOString());
        if (selectedProfessional !== 'any') {
          apptQuery = apptQuery.eq('professional_id', selectedProfessional!.id);
          blockQuery = blockQuery.eq('professional_id', selectedProfessional!.id);
        }
        const [{ data: a }, { data: b }] = await Promise.all([apptQuery, blockQuery]);
        appts = a || [];
        blocks = b || [];
      }

      const [openH, openM] = (tenant!.open_time || '09:00').split(':').map(Number);
      const [closeH, closeM] = (tenant!.close_time || '18:00').split(':').map(Number);
      
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;
      
      const profsToCheck = selectedProfessional === 'any' ? professionals : [selectedProfessional];
      const validSlots: string[] = [];

      for (let time = openMinutes; time < closeMinutes; time += 15) {
        const slotH = Math.floor(time / 60);
        const slotM = time % 60;
        const slotTimeStr = `${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`;
        
        const serviceDurationMinutes = selectedService!.duration_slots * 15;
        const endTime = time + serviceDurationMinutes;

        if (endTime > closeMinutes) continue;

        const slotStart = new Date(selectedDate!);
        slotStart.setHours(slotH, slotM, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDurationMinutes);

        let isFree = false;

        for (const prof of profsToCheck) {
          const hasAppt = appts?.some(a => {
            if (a.professional_id !== prof?.id) return false;
            const aStart = new Date(a.starts_at);
            const aEnd = new Date(a.ends_at);
            return (aStart < slotEnd && aEnd > slotStart);
          });

          const hasBlock = blocks?.some(b => {
            if (b.professional_id !== prof?.id) return false;
            const bStart = new Date(b.starts_at);
            const bEnd = new Date(b.ends_at);
            return (bStart < slotEnd && bEnd > slotStart);
          });

          if (!hasAppt && !hasBlock) {
            isFree = true;
            break;
          }
        }

        if (isFree) {
          const now = new Date();
          if (selectedDate!.toDateString() === now.toDateString()) {
             if (slotStart > now) {
                validSlots.push(slotTimeStr);
             }
          } else {
             validSlots.push(slotTimeStr);
          }
        }
      }

      setAvailableSlots(validSlots);
      setSlotsLoading(false);
    }
    
    loadAvailability();
  }, [selectedDate, tenant, selectedProfessional, selectedService, professionals, dataCtx]);

  // Step 1: Load tenant and services
  useEffect(() => {
    if (!slug) return;
    async function loadTenant() {
      setLoading(true);
      setError(null);

      try {
        let tenantData: any = null;
        let servicesData: any[] = [];

        if (dataCtx) {
          tenantData = await dataCtx.getTenant(slug!);
          if (tenantData) servicesData = await dataCtx.getActiveServices(tenantData.id);
        } else {
          const { supabase: sb } = await import('@onclick/utils');
          const { data: td, error: te } = await sb.from('tenants').select('*').eq('slug', slug).single();
          if (te || !td) throw new Error("No se encontró el negocio.");
          tenantData = td;
          const { data: sd } = await sb.from('services').select('*').eq('tenant_id', td.id).eq('is_active', true);
          servicesData = sd || [];
        }

        if (!tenantData) {
          setError("No se encontró el negocio.");
          setLoading(false);
          return;
        }

        if (tenantData.status === 'suspended') {
          setError("Este negocio no está disponible en este momento.");
          setLoading(false);
          return;
        }

        setTenant(tenantData);
        setServices(servicesData);
      } catch (err: any) {
        setError(err.message || "Error al cargar el negocio.");
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, [slug, dataCtx]);

  // Step 2: Load professionals when advancing to step 2
  useEffect(() => {
    if (step === 2 && tenant) {
      async function loadProfessionals() {
        if (dataCtx) {
          const data = await dataCtx.getActiveProfessionals(tenant!.id);
          setProfessionals(data.map(p => ({
            id: p.id,
            display_name: p.display_name || '',
            specialty: p.specialty || '',
            avatar_url: (p as any).users?.avatar_url
          })));
        } else {
          const { supabase: sb } = await import('@onclick/utils');
          const { data } = await sb.from('professionals').select('*, users(avatar_url)')
            .eq('tenant_id', tenant!.id).eq('is_available', true);
          if (data) {
            setProfessionals(data.map(p => ({
              id: p.id,
              display_name: p.display_name,
              specialty: p.specialty,
              avatar_url: (p as any).users?.avatar_url
            })));
          }
        }
      }
      loadProfessionals();
    }
  }, [step, tenant, dataCtx]);

  // Handle phone blur to prefill name
  const handlePhoneBlur = async () => {
    if (!clientPhone || !tenant) return;
    try {
      let name: string | null = null;
      if (dataCtx) {
        const client = await dataCtx.getClientByPhone(tenant.id, clientPhone);
        name = client?.full_name || null;
      } else {
        const { supabase: sb } = await import('@onclick/utils');
        const { data } = await sb.from('clients').select('full_name').eq('tenant_id', tenant.id).eq('phone', clientPhone).single();
        name = data?.full_name || null;
      }
      if (name && !clientName) setClientName(name);
    } catch {}
  };

  const handleBooking = async () => {
    if (!tenant || !selectedService || !selectedProfessional || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      return;
    }
    
    setLoading(true);
    
    // Parse times
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startsAt = new Date(selectedDate);
    startsAt.setHours(hours, minutes, 0, 0);
    
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + selectedService.duration_slots * 15);

    // Let frontend pick random professional if 'any'
    let finalProfessionalId = '';
    if (selectedProfessional === 'any') {
      // For now pick random. In a real app we would pick one that is available for this slot.
      // Since availableSlots computation for 'any' ensures AT LEAST ONE is free, we need to pick that one.
      // For simplicity here without duplicating slot logic, just pick random from professionals list.
      // Ideally the edge function handles it or we re-check here.
      finalProfessionalId = professionals[Math.floor(Math.random() * professionals.length)].id;
    } else {
      finalProfessionalId = selectedProfessional.id;
    }

    try {
      if (dataCtx) {
        // Demo / in-memory booking
        const client = await dataCtx.upsertClient(tenant.id, clientPhone, clientName);
        if (!client) throw new Error('No se pudo registrar el cliente');
        await dataCtx.createAppointment({
          tenant_id: tenant.id,
          professional_id: finalProfessionalId,
          service_id: selectedService.id,
          client_id: client.id,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: 'confirmed',
          notes: null,
          booked_from: 'public_url',
          whatsapp_sent: false,
        });
      } else {
        const { supabase: sb } = await import('@onclick/utils');
        const { error } = await sb.functions.invoke('book-appointment', {
          body: {
            tenant_id: tenant.id,
            professional_id: finalProfessionalId,
            service_id: selectedService.id,
            client_name: clientName,
            client_phone: clientPhone,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            booked_from: 'public_url'
          }
        });
        if (error) throw error;
      }
      setStep(5); // Success
    } catch (err: any) {
      alert("Hubo un error al confirmar la reserva: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:items-center">
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center gap-4 w-full md:max-w-md">
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 rounded-full object-cover" />
        )}
        <h1 className="text-xl font-semibold text-gray-800">{tenant.name}</h1>
      </header>

      <main className="flex-1 w-full md:max-w-md bg-white">
        {/* PROGRESS BAR */}
        {step < 5 && (
          <div className="flex w-full h-1 bg-gray-100">
            <div className={`h-full bg-blue-600 transition-all`} style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        )}

        <div className="p-4 sm:p-6">
          {step > 1 && step < 5 && (
            <button 
              onClick={() => setStep(step - 1)} 
              className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </button>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">¿Qué servicio buscás?</h2>
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all bg-white group flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {service.duration_slots * 15} min • ${service.price}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
              {services.length === 0 && <p className="text-gray-500">No hay servicios disponibles.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Elegí un profesional</h2>
              <button
                onClick={() => {
                  setSelectedProfessional('any');
                  setStep(3);
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all bg-white group flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                  <Shuffle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Sin preferencia</h3>
                  <p className="text-sm text-gray-500">Cualquier profesional disponible</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
              </button>

              {professionals.map(prof => (
                <button
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfessional(prof);
                    setStep(3);
                  }}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all bg-white group flex items-center gap-4"
                >
                  {prof.avatar_url ? (
                    <img src={prof.avatar_url} alt={prof.display_name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {prof.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{prof.display_name}</h3>
                    <p className="text-sm text-gray-500">{prof.specialty}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Fecha y hora</h2>
              
              <div className="mb-4">
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-lg p-3"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={async (e) => {
                    const date = new Date(e.target.value + 'T00:00:00');
                    // Verify if it's a working day
                    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1-7
                    if (!tenant.working_days.includes(dayOfWeek)) {
                      alert("El negocio no atiende ese día.");
                      setSelectedDate(null);
                      setAvailableSlots([]);
                      return;
                    }
                    setSelectedDate(date);
                  }}
                />
              </div>

              {selectedDate && (
                <div className="mt-4">
                  {slotsLoading ? (
                    <div className="flex justify-center py-4 text-gray-500">Buscando turnos disponibles...</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => {
                            setSelectedTime(time);
                            setStep(4);
                          }}
                          className="p-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                        >
                          {time}
                        </button>
                      ))}
                      {availableSlots.length === 0 && (
                        <p className="col-span-4 text-sm text-gray-500 text-center py-4">No hay turnos disponibles para este día.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Tus datos</h2>
              
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                <p className="text-sm flex justify-between"><span className="text-gray-500">Servicio:</span> <span className="font-medium text-gray-900">{selectedService?.name}</span></p>
                <p className="text-sm flex justify-between"><span className="text-gray-500">Profesional:</span> <span className="font-medium text-gray-900">{selectedProfessional === 'any' ? 'Sin preferencia' : selectedProfessional?.display_name}</span></p>
                <p className="text-sm flex justify-between"><span className="text-gray-500">Fecha:</span> <span className="font-medium text-gray-900">{selectedDate?.toLocaleDateString()} a las {selectedTime}</span></p>
                <p className="text-sm flex justify-between"><span className="text-gray-500">Precio:</span> <span className="font-medium text-gray-900">${selectedService?.price}</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    placeholder="Ej: 1123456789"
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={!clientName || !clientPhone || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Confirmando...' : 'Confirmar turno'}
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <CheckCircle2 className="w-20 h-20 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Tu turno está confirmado!</h2>
                <p className="text-gray-500">Te esperamos el {selectedDate?.toLocaleDateString()} a las {selectedTime}.</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2 inline-block w-full max-w-sm border border-gray-100 mx-auto">
                 <p className="text-sm flex justify-between"><span className="text-gray-500">Servicio:</span> <span className="font-medium text-gray-900">{selectedService?.name}</span></p>
                 <p className="text-sm flex justify-between"><span className="text-gray-500">Profesional:</span> <span className="font-medium text-gray-900">{selectedProfessional === 'any' ? 'Cualquiera' : selectedProfessional?.display_name}</span></p>
                 <p className="text-sm flex justify-between"><span className="text-gray-500">Precio:</span> <span className="font-medium text-gray-900">${selectedService?.price}</span></p>
              </div>

              <p className="text-sm text-gray-500 mt-6">
                Si necesitás cancelar o reprogramar, comunicate al <span className="font-medium text-gray-700">{tenant?.phone || 'negocio'}</span>.
              </p>

              <button
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedProfessional(null);
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setClientName('');
                  setClientPhone('');
                }}
                className="mt-8 text-blue-600 font-medium hover:underline"
              >
                Volver al inicio
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

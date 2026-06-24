# onClick — Guía de Desarrollo Secuencial por Prompts

> Stack: React SPA (Vite + TypeScript) · Supabase · Cloudflare Pages/Workers · Astro (landing) · Next.js (superadmin) · Tailwind CSS

Cada prompt está diseñado para ser autocontenido. Copiá el prompt completo en tu asistente de IA, ejecutá, revisá, y pasá al siguiente.

---

## PROMPT 01 — Estructura del monorepo y configuración base

```
Creá la estructura completa del monorepo para el proyecto onClick, un SaaS de agenda online.

Estructura de carpetas:
onclick/
├── apps/
│   ├── landing/          # Astro + React Islands + TypeScript
│   ├── dashboard/        # React SPA + Vite + TypeScript
│   └── superadmin/       # Next.js + TypeScript
├── packages/
│   ├── ui/               # Componentes compartidos
│   ├── types/            # TypeScript types compartidos
│   └── utils/            # Funciones utilitarias compartidas
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── workers/              # Cloudflare Workers

Tareas:
1. Inicializá el monorepo con pnpm workspaces (package.json raíz con workspaces: ["apps/*", "packages/*"]).
2. Creá el proyecto `apps/dashboard` con Vite + React + TypeScript. Instalá: tailwindcss, @supabase/supabase-js, react-router-dom, lucide-react.
3. Configurá Tailwind en el dashboard con la fuente Inter de Google Fonts.
4. Creá `packages/types/index.ts` con las interfaces TypeScript para todas las entidades del modelo de datos:
   - Tenant, User, Invitation, Service, Professional, Client, Appointment, TimeBlock, Subscription, PaymentHistory
   - Incluí los tipos literales para los campos de estado (tenant status, appointment status, plan, role, etc.)
5. Creá `packages/utils/supabase.ts` con el cliente de Supabase configurado con las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
6. Creá el archivo `.env.example` en la raíz con todas las variables necesarias del proyecto (Supabase, Mercado Pago, Meta API, APP_URL, PUBLIC_URL).

No implementes lógica de negocio todavía. Solo scaffolding, configuración y tipos.
```

---

## PROMPT 02 — Migraciones SQL y Row Level Security en Supabase

```
Creá todas las migraciones SQL para el proyecto onClick en la carpeta supabase/migrations/.

Tablas a crear (con sus columnas exactas):

1. tenants: id UUID PK, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, phone TEXT, email TEXT, logo_url TEXT, working_days INT[] DEFAULT '{1,2,3,4,5}', open_time TIME DEFAULT '09:00', close_time TIME DEFAULT '18:00', status TEXT DEFAULT 'trial' CHECK IN ('trial','active','suspended','cancelled'), trial_ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()

2. users: id UUID PK REFERENCES auth.users, tenant_id UUID REFERENCES tenants(id), role TEXT NOT NULL CHECK IN ('admin','professional','superadmin'), full_name TEXT, phone TEXT, avatar_url TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()

3. invitations: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), token TEXT UNIQUE NOT NULL, email TEXT, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ, created_by UUID REFERENCES users(id)

4. services: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), name TEXT NOT NULL, duration_slots INT NOT NULL, price NUMERIC(10,2), color TEXT, is_active BOOLEAN DEFAULT TRUE

5. professionals: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), user_id UUID REFERENCES users(id), display_name TEXT, specialty TEXT, is_available BOOLEAN DEFAULT TRUE

6. clients: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), full_name TEXT NOT NULL, phone TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id, phone)

7. appointments: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), professional_id UUID REFERENCES professionals(id), service_id UUID REFERENCES services(id), client_id UUID REFERENCES clients(id), starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, status TEXT DEFAULT 'confirmed' CHECK IN ('confirmed','cancelled','blocked','no_show'), notes TEXT, booked_from TEXT DEFAULT 'system' CHECK IN ('system','public_url'), whatsapp_sent BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()

8. time_blocks: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), professional_id UUID REFERENCES professionals(id), starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, reason TEXT

9. subscriptions: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), plan TEXT NOT NULL CHECK IN ('base','pro','premium'), status TEXT DEFAULT 'trial' CHECK IN ('trial','active','past_due','cancelled'), payment_method TEXT CHECK IN ('mercadopago','manual'), mp_subscription_id TEXT, current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ, promo_ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()

10. payment_history: id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id), subscription_id UUID REFERENCES subscriptions(id), amount NUMERIC(10,2), method TEXT CHECK IN ('mercadopago','manual'), status TEXT CHECK IN ('paid','failed','refunded'), paid_at TIMESTAMPTZ, notes TEXT

Luego creá las políticas RLS:
- Habilitá RLS en todas las tablas excepto tenants y users (que tienen su propia lógica).
- Política base de aislamiento por tenant_id usando auth.jwt() ->> 'tenant_id' para appointments, services, professionals, clients, time_blocks, subscriptions, payment_history, invitations.
- Política adicional para appointments: los profesionales solo pueden hacer UPDATE en turnos donde professional_id coincida con su propio ID del JWT.
- El superadmin (role = 'superadmin') bypasea RLS en todas las tablas usando una función helper is_superadmin().

También creá supabase/seed.sql con un tenant demo con slug='demo', 2 profesionales, 3 servicios y 5 turnos de ejemplo para la siguiente semana.
```

---

## PROMPT 03 — Autenticación: registro, login y contexto de sesión

```
Implementá el sistema de autenticación completo para el dashboard de onClick (apps/dashboard).

Contexto:
- Stack: React + Vite + TypeScript + Supabase Auth + React Router
- El JWT de Supabase debe incluir tenant_id y role en los custom claims (esto se configura con una función trigger en Supabase que setea app_metadata al crear/actualizar el usuario en la tabla users).

Tareas:

1. Creá la función SQL de Supabase que sincroniza app_metadata con los campos tenant_id y role de la tabla users cada vez que se inserta o actualiza un registro en users.

2. En el dashboard, creá src/contexts/AuthContext.tsx con:
   - Estado: user (SupabaseUser | null), profile (User de nuestros types | null), loading boolean
   - Funciones: signIn(email, password), signOut(), isAdmin(), isProfessional()
   - Hook useAuth() exportado

3. Creá src/pages/LoginPage.tsx:
   - Formulario: email + contraseña
   - Manejo de errores de Supabase (credenciales incorrectas, email no verificado)
   - Link "¿Olvidaste tu contraseña?"
   - Diseño limpio con Tailwind, fuente Inter, paleta navy/azul eléctrico

4. Creá src/pages/RegisterPage.tsx:
   - Campos: nombre completo, email, contraseña, confirmar contraseña
   - Al registrarse con Supabase Auth, crear el registro en la tabla tenants (status='trial', trial_ends_at=NOW()+14days) y en users (role='admin') dentro de una Edge Function de Supabase para hacerlo con service_role key.
   - Llamar a esa Edge Function desde el cliente después del signUp exitoso.
   - Redirigir al onboarding tras registro exitoso.

5. Creá src/components/ProtectedRoute.tsx que verifica la sesión activa y redirige a /login si no hay usuario.

6. Configurá las rutas en src/App.tsx:
   /login, /register, /onboarding (protegida), /dashboard/* (protegida)
```

---

## PROMPT 04 — Onboarding wizard (4 pasos)

```
Implementá el wizard de onboarding de onClick que se muestra al admin tras el primer registro.

Contexto:
- React + TypeScript + Tailwind
- El wizard tiene 4 pasos y debe completarse antes de acceder al dashboard
- Al finalizar, se persisten los datos en las tablas tenants y services en Supabase

Pasos del wizard:

PASO 1 — Datos del negocio:
- Input: Nombre del negocio (requerido)
- Input: Teléfono de contacto (requerido)
- Upload: Logo (opcional, sube a Supabase Storage bucket 'tenant-assets', ruta: {tenant_id}/logo)
- Input: Slug / URL pública (se auto-genera en lowercase-sin-espacios del nombre, editable, validar unicidad consultando la tabla tenants en tiempo real con debounce de 500ms)

PASO 2 — Días y horarios:
- Checkboxes para días: Lun Mar Mié Jue Vie Sáb Dom (default: Lun-Vie seleccionados)
- Time pickers: Horario apertura y cierre (default: 09:00 - 18:00)
- Vista previa textual del horario resultante: "Lunes a Viernes, 9:00 a 18:00"

PASO 3 — Servicios:
- Formulario repetible para agregar servicios:
  - Nombre del servicio
  - Duración (selector: 15, 30, 45, 60, 90, 120 min)
  - Precio (número, en pesos ARS)
  - Color (paleta de 8 colores predefinidos: teal, blue, violet, pink, orange, red, green, yellow)
- Botón "Agregar otro servicio"
- Mínimo 1 servicio para continuar
- Botón para eliminar cada servicio

PASO 4 — Resumen:
- Muestra en modo lectura todo lo configurado: nombre, slug, horario, días, lista de servicios
- Botón "Ir a mi agenda" que persiste todo en Supabase y redirige al dashboard

Diseño:
- Indicador de progreso en la parte superior (4 puntos o steps numerados)
- Botones Anterior / Siguiente en cada paso
- Validaciones inline con mensajes de error
- Animación de transición suave entre pasos (fade o slide)
```

---

## PROMPT 05 — Layout del dashboard y navegación lateral

```
Implementá el layout principal del dashboard de onClick con navegación lateral.

Contexto:
- React + TypeScript + Tailwind
- El sidebar debe parecerse al estilo de Google Gemini: icónico, compacto, con expansión al hover o toggle
- Paleta: fondo oscuro navy (#0f1729) para el sidebar, fondo claro (#f8fafc) para el contenido

Estructura del layout:

1. Creá src/layouts/DashboardLayout.tsx con:
   - Sidebar izquierdo (colapsable)
   - Área de contenido principal (ocupa el resto del ancho)
   - Header superior con: nombre del negocio, avatar del usuario, botón de cierre de sesión

2. Sidebar con los siguientes ítems de navegación y sus íconos (usar lucide-react):
   - Agenda (Calendar) — visible para admin y profesional
   - Servicios (Scissors) — solo admin
   - Profesionales (Users) — solo admin
   - Reportes (BarChart2) — visible para ambos (admin ve todo, profesional ve solo los suyos)
   - Configuración (Settings) — solo admin
   
   El ítem activo se resalta con fondo azul eléctrico (#2563eb) y texto blanco.

3. Banner de prueba gratuita (si tenant.status === 'trial'):
   - Barra superior dentro del contenido (no en el sidebar)
   - Fondo amber/amarillo suave, texto: "Estás en tu período de prueba. Te quedan X días. Elegí un plan para continuar."
   - Botón "Ver planes" que navega a /dashboard/configuracion#suscripcion
   - X días se calcula dinámicamente de trial_ends_at

4. Modal de bloqueo total (si tenant.status === 'suspended' o subscription.status === 'past_due'):
   - Overlay que cubre toda la pantalla, no se puede cerrar con ESC ni click fuera
   - Mensaje diferenciado según la causa: prueba vencida vs pago fallido
   - Botón de acción: "Elegir un plan" o "Regularizar pago"

5. Loader global mientras se carga la sesión y los datos del tenant.
```

---

## PROMPT 06 — Módulo Agenda: grilla semanal

```
Implementá el módulo de Agenda de onClick, que es la vista principal del dashboard.

Contexto:
- React + TypeScript + Tailwind + Supabase Realtime
- La agenda es una grilla semanal donde cada columna es un profesional y cada fila es un slot de 15 minutos
- El horario visible va desde open_time hasta close_time del tenant

Estructura de la grilla:

1. Creá src/pages/AgendaPage.tsx con:
   - Eje X (columnas): un profesional por columna. Primera columna fija con las horas.
   - Eje Y (filas): slots de 15 minutos desde open_time hasta close_time
   - Navegación: botones "Semana anterior" / "Semana siguiente" / "Hoy" + selector de fecha
   - La vista muestra 7 días (Lun–Dom) o solo los working_days del tenant (a decidir: mostrar siempre 7 pero grisando los días no laborales)

2. Renderizado de celdas:
   - Celda libre: fondo blanco, hover con fondo azul muy claro, cursor pointer
   - Celda con turno: fondo del color del servicio, texto con nombre del cliente y servicio
   - Un turno puede ocupar múltiples filas (según duration_slots del servicio)
   - Celda bloqueada (time_block): fondo gris #e5e7eb con ícono de candado (Lock de lucide)
   - Celda fuera del horario laboral: fondo #f1f5f9 sin interacción

3. Comportamiento de click:
   - Click en celda libre → abrir ModalCrearTurno (ver prompt siguiente)
   - Click en celda con turno → abrir ModalDetalleTurno
   - Click + drag sobre celdas libres (o Shift+Click) → seleccionar rango para bloquear

4. Bloqueo de rango:
   - Al soltar el drag sobre celdas seleccionadas → abrir ModalBloqueo con el rango pre-cargado
   - Modal: mostrar el rango (ej: "Martes 10 de junio, 14:00 – 15:30"), campo de motivo (opcional), botones Cancelar / Confirmar

5. Supabase Realtime:
   - Suscribirse a cambios en las tablas appointments y time_blocks para el tenant_id actual
   - Los cambios de otros profesionales se reflejan automáticamente sin recargar

6. Consultas de datos:
   - Al montar y al cambiar semana: fetchear appointments y time_blocks de la semana actual para el tenant
   - Fetchear professionals del tenant para renderizar columnas

Restricciones por rol:
   - Admin: puede operar en cualquier columna
   - Profesional: puede crear turnos solo en su propia columna, no puede crear time_blocks en columnas ajenas
```

---

## PROMPT 07 — Modales de la agenda: crear turno y detalle de turno

```
Implementá los modales del módulo Agenda de onClick.

MODAL 1: ModalCrearTurno

Props: isOpen, onClose, defaultDate (Date), defaultTime (string "HH:MM"), defaultProfessionalId (string)

Campos y lógica:
1. Buscador de cliente: input de texto que busca en tiempo real en la tabla clients del tenant por nombre o teléfono (debounce 400ms). Muestra lista de resultados debajo. Al seleccionar uno, se pre-carga.
2. Si no encuentra cliente: botón "Agendar como nuevo cliente" que expande dos inputs: nombre completo y teléfono. Al guardar, se crea el cliente en la tabla clients.
3. Selector de servicio: dropdown con los servicios activos del tenant. Muestra nombre, duración en minutos y precio. Al seleccionar, calcula automáticamente ends_at = starts_at + (duration_slots * 15 minutos).
4. Selector de profesional: dropdown pre-seleccionado con defaultProfessionalId, editable solo por admin.
5. Fecha y hora de inicio: date picker + time picker (con slots de 15 min disponibles para esa fecha/profesional).
6. Notas: textarea opcional.
7. Botones: Cancelar / Confirmar turno.
8. Al confirmar: INSERT en appointments con booked_from='system', luego cerrar modal y actualizar la grilla.
9. Validar que el slot no esté ocupado antes de guardar (puede haber sido tomado mientras el modal estaba abierto).

MODAL 2: ModalDetalleTurno

Props: isOpen, onClose, appointment (Appointment & { client, service, professional })

Contenido:
- Nombre del cliente, teléfono
- Servicio: nombre, duración, precio
- Profesional asignado
- Fecha y hora
- Estado actual (badge de color: confirmed=verde, cancelled=gris, no_show=rojo)
- Notas (si las hay)
- Botones:
  - "Cancelar turno" → cambia status a 'cancelled' con confirmación
  - "Marcar como no-show" → cambia status a 'no_show'
  - "Editar" → convierte el modal a modo edición (mismos campos que crear turno)
  - Restricción: el profesional solo puede editar/cancelar turnos propios

MODAL 3: ModalBloqueo (mencionado en prompt anterior, implementar aquí)

Props: isOpen, onClose, professionalId, startsAt (Date), endsAt (Date)

- Muestra el rango formateado: "Bloqueando para [Nombre Profesional]: Martes 10 de junio, 14:00 a 15:30"
- Input de motivo (opcional)
- Botones: Cancelar / Confirmar bloqueo
- Al confirmar: INSERT en time_blocks
```

---

## PROMPT 08 — Módulo Servicios

```
Implementá el módulo de Servicios de onClick (solo accesible para admin).

Contexto: React + TypeScript + Tailwind + Supabase

Creá src/pages/ServiciosPage.tsx con:

1. Vista en grid de tarjetas (3 columnas en desktop, 1 en mobile).
   Cada tarjeta muestra:
   - Indicador de color (cuadrado o círculo del color del servicio)
   - Nombre del servicio
   - Duración: "X min" (duration_slots * 15)
   - Precio: "$X.XXX" formateado en pesos ARS
   - Badge de estado: "Activo" (verde) o "Inactivo" (gris)
   - Menú de acciones con tres puntos (⋮): Editar | Activar/Desactivar | Eliminar

2. Botón "Agregar servicio" en la esquina superior derecha → abre ModalServicio.

3. ModalServicio (usado tanto para crear como para editar):
   - Título dinámico: "Nuevo servicio" / "Editar servicio"
   - Input: Nombre del servicio (requerido)
   - Select de duración: 15, 30, 45, 60, 90, 120 min (guarda como duration_slots = minutos/15)
   - Input numérico: Precio en ARS
   - Selector de color: paleta de 8 colores con clicks (teal=#0d9488, blue=#2563eb, violet=#7c3aed, pink=#db2777, orange=#ea580c, red=#dc2626, green=#16a34a, yellow=#ca8a04)
   - Botones: Cancelar / Guardar
   - Validaciones inline

4. Confirmación antes de eliminar: "¿Eliminar el servicio '[nombre]'? Esta acción no se puede deshacer."
   - Si el servicio tiene turnos futuros asociados, mostrar advertencia: "Este servicio tiene turnos confirmados. Al eliminarlo, los turnos no serán afectados pero el servicio no podrá seleccionarse para nuevos turnos. Considerá desactivarlo en su lugar."

5. Toggle activar/desactivar actualiza is_active en Supabase.

6. Los servicios inactivos se muestran al final del grid con opacidad reducida.
```

---

## PROMPT 09 — Módulo Profesionales e invitaciones

```
Implementá el módulo de Profesionales de onClick (solo accesible para admin).

Contexto: React + TypeScript + Tailwind + Supabase

Creá src/pages/ProfesionalesPage.tsx con:

1. Vista en grid de tarjetas (3 columnas desktop, 1 mobile).
   Cada tarjeta muestra:
   - Avatar: inicial del nombre en círculo con color generado desde el nombre
   - Nombre completo (display_name)
   - Especialidad (specialty, si existe)
   - Toggle "Disponible" / "No disponible" (actualiza is_available en professionals)
   - Badge: "Admin" si el profesional tiene role='admin'
   - Botón de opciones (⋮): Editar perfil | Eliminar

2. Botón "Invitar profesional" en la esquina superior derecha.
   - Si el plan es 'base' y ya hay 1 profesional (el admin), mostrar tooltip: "El plan Base solo incluye 1 profesional. Actualizá a Pro para agregar más."
   - Si el plan es 'pro' y ya hay 5 profesionales, ídem con el límite.
   - Si el plan es 'premium' o hay lugar: abrir ModalInvitacion.

3. ModalInvitacion:
   - Input de email (opcional, sirve para registrar a quién se invita)
   - Al hacer click en "Generar link": llamar a una Edge Function de Supabase que:
     a. Inserta en invitations: token = gen_random_bytes(32) en hex, expires_at = NOW() + 48h
     b. Retorna el link: https://app.onclick.com/invitacion?token={token}
   - Mostrar el link generado en un input de solo lectura con botón "Copiar"
   - Botón "Compartir por WhatsApp" que abre: https://wa.me/?text=Te+invito+a+unirte+a+nuestro+equipo+en+onClick%3A+{link}
   - El link vence en 48 horas (mostrar countdown o solo el texto "Vence en 48 horas")

4. Página de registro por invitación (src/pages/InvitacionPage.tsx):
   - Acceso vía /invitacion?token=xxx
   - Al cargar: validar token en la tabla invitations (que no esté vencido ni usado)
   - Si válido: mostrar formulario con nombre completo y contraseña
   - Al registrarse: 
     a. Supabase Auth signUp con el email (si está en la invitación) o pedirlo en el form
     b. Edge Function que crea el user con role='professional' y tenant_id de la invitación, crea el professionals, y marca la invitación como usada (used_at=NOW())
   - Si token inválido o vencido: mostrar mensaje de error y link para pedir un nuevo invitación al admin

5. Límites por plan (constante o config):
   - base: máx 1 profesional (solo admin)
   - pro: máx 5 profesionales
   - premium: ilimitado
```

---

## PROMPT 10 — Módulo Reportes

```
Implementá el módulo de Reportes de onClick.

Contexto: React + TypeScript + Tailwind + Supabase
Usar una librería de gráficos: Recharts (instalala con pnpm si no está).

Creá src/pages/ReportesPage.tsx con:

Lógica de acceso:
- Admin: ve métricas globales del tenant
- Profesional: ve solo sus propias métricas (filtrar por professional_id del usuario actual)

1. Filtro de fecha en la parte superior:
   - Botones rápidos: "Esta semana" | "Este mes" | "Últimos 3 meses"
   - Rango personalizado: date picker desde/hasta
   - El filtro afecta a todos los componentes de la página

2. Cards de resumen (fila de 3 o 4 cards):
   - Total de turnos en el período (status='confirmed' + 'no_show')
   - Turnos cancelados
   - Clientes atendidos (clientes únicos)
   - Ingresos estimados (suma de price de los servicios de los turnos confirmados)

3. Gráfico de barras (Recharts BarChart):
   - Eje X: días de la semana (Lun–Dom) o días del período seleccionado
   - Eje Y: cantidad de turnos
   - Título: "Turnos por día"

4. Gráfico de torta (Recharts PieChart):
   - Distribución de turnos por servicio
   - Leyenda con nombre del servicio y porcentaje
   - Título: "Distribución por servicio"

5. Tabla de rendimiento por profesional (solo visible para admin):
   - Columnas: Profesional | Turnos realizados | Servicios más solicitado | Ingresos estimados
   - Ordenable por cualquier columna

6. Todas las queries a Supabase deben filtrar por tenant_id y por el rango de fechas seleccionado. Las queries del profesional además filtran por professional_id.
```

---

## PROMPT 11 — Módulo Configuración

```
Implementá el módulo de Configuración de onClick (solo accesible para admin).

Contexto: React + TypeScript + Tailwind + Supabase

Creá src/pages/ConfiguracionPage.tsx con navegación interna por tabs o secciones con anclas:

SECCIÓN 1 — Negocio (id="negocio"):
- Input: Nombre del negocio
- Input: Teléfono de contacto
- Upload de logo: preview de imagen actual, botón para cambiar (sube a Supabase Storage bucket 'tenant-assets', ruta: {tenant_id}/logo), botón para eliminar
- Checkboxes de días habilitados: Lun Mar Mié Jue Vie Sáb Dom
- Time pickers: Horario apertura y cierre
- Input: Slug / URL pública (con validación de unicidad en tiempo real, debounce 500ms). Mostrar la URL resultante: onclick.com/{slug}
- Botón "Guardar cambios" → UPDATE en tenants

SECCIÓN 2 — Notificaciones (id="notificaciones"):
- Toggle: "Activar recordatorios por WhatsApp"
- Select: Tiempo de anticipación (1 hora antes | 2 horas antes | 12 horas antes | 24 horas antes)
- Solo habilitado si el toggle está activo
- Texto explicativo: "Tus clientes recibirán un recordatorio por WhatsApp antes de su turno."
- Botón "Guardar"

SECCIÓN 3 — Suscripción (id="suscripcion"):
- Si está en trial: mostrar los 3 planes como cards comparativas:
  | Plan Base | Plan Pro | Plan Premium |
  $12.000/mes → $9.000/mes los primeros 3 meses
  $25.000/mes → $22.000/mes los primeros 3 meses
  $43.000/mes → $40.000/mes los primeros 3 meses
  - Plan Pro con borde azul y badge "Más elegido"
  - Botón "Elegir plan" en cada card
  - Al elegir: modal para seleccionar método de pago (Mercado Pago | Efectivo / Transferencia)

- Si tiene plan activo: mostrar detalle del plan actual:
  - Nombre del plan, precio, próximo vencimiento
  - Método de pago actual
  - Botón "Mejorar plan" (solo hacia arriba, con modal de confirmación)
  - Botón "Cambiar a plan inferior" (con advertencia de pérdida de funcionalidades)
  - Botón "Cancelar suscripción" (con confirmación: "Tu acceso se mantendrá hasta [fecha]. Podés reactivar en cualquier momento.")

Estilo: Tabs horizontales en la parte superior para navegar entre secciones, con smooth scroll si se usa anchor links.
```

---

## PROMPT 12 — URL pública del negocio (flujo de reserva para clientes)

```
Implementá la URL pública de reservas de onClick: onclick.com/{slug}

Contexto:
- Esta página corre en el mismo proyecto Cloudflare Pages que el dashboard
- No requiere autenticación del cliente final
- El cliente pasa por 4 pasos para reservar un turno

Creá src/pages/PublicBookingPage.tsx con routing param: /slug/:slug

PASO 1 — Elegir servicio:
- Cargar el tenant por slug, mostrar nombre del negocio y logo en el header
- Si el tenant está suspendido: mostrar mensaje "Este negocio no está disponible en este momento."
- Lista de servicios activos: nombre, duración en minutos, precio en ARS
- Click en un servicio → avanza al paso 2

PASO 2 — Elegir profesional:
- Lista de profesionales con is_available=true
- Card con avatar (inicial en círculo), nombre y especialidad
- Opción especial al inicio: "Sin preferencia" (ícono de dado o shuffle)
- Click en uno → avanza al paso 3

PASO 3 — Elegir fecha y hora:
- Calendario mensual con días habilitados (working_days del tenant) y días pasados deshabilitados
- Al seleccionar una fecha: mostrar los slots horarios disponibles para ese día
- Lógica de slots disponibles:
  a. Generar todos los slots del día (open_time a close_time, cada 15 min)
  b. Restar los que ya tienen appointment confirmado para ese profesional (o para todos si eligió "sin preferencia")
  c. Restar los time_blocks del profesional en ese rango
  d. Restar slots insuficientes para la duración del servicio seleccionado (si el servicio dura 60 min, no mostrar slots donde no caben 4 slots seguidos)
  e. Si eligió "Sin preferencia": mostrar slots donde al menos un profesional esté disponible
- Mostrar slots como botones en grid (ej: 09:00, 09:15, 09:30...)
- Click en slot → avanza al paso 4

PASO 4 — Confirmar datos:
- Input: Nombre completo (requerido)
- Input: Teléfono (requerido, formato argentino)
- Si el teléfono ya existe en clients del tenant: pre-llenar el nombre (editable)
- Resumen de la reserva en sidebar o card: servicio, profesional, fecha, hora, precio
- Botón "Confirmar turno"
- Al confirmar:
  a. Upsert en clients (tenant_id + phone como unique key)
  b. INSERT en appointments con booked_from='public_url'
  c. Usar SELECT FOR UPDATE en una Edge Function para evitar doble reserva
  d. Redirigir a pantalla de confirmación exitosa

PANTALLA DE ÉXITO:
- Ícono de check animado
- "¡Tu turno está confirmado!"
- Resumen: servicio, profesional, fecha, hora
- "Si necesitás cancelar o reprogramar, comunicate al {phone del negocio}"
- Botón "Volver al inicio" (vuelve al paso 1)

Diseño: limpio, mobile-first, sin sidebar, header solo con logo del negocio
```

---

## PROMPT 13 — Demo sin registro (tenant en memoria)

```
Implementá la funcionalidad de demo sin registro de onClick accesible en /demo.

Contexto: React + TypeScript + Tailwind
La demo usa un tenant ficticio cargado en memoria (React Context o Zustand), sin ninguna llamada a Supabase.

1. Creá src/contexts/DemoContext.tsx con el estado inicial del tenant demo:
   - Tenant: { id: 'demo', name: 'Barber Shop Demo', slug: 'demo', working_days: [1,2,3,4,5,6], open_time: '09:00', close_time: '19:00' }
   - 3 servicios: Corte de cabello (30 min, $8.000), Barba (20 min, $5.000), Corte + Barba (45 min, $12.000)
   - 2 profesionales: "Carlos Gómez" y "Lucía Fernández"
   - 8 turnos distribuidos en la semana actual con diferentes servicios y clientes ficticios
   - CRUD completo en memoria: funciones para crear/editar/eliminar turnos, servicios, profesionales, time_blocks

2. Creá un hook useDemoData() que provea las mismas interfaces que los hooks de Supabase pero leyendo/escribiendo en el DemoContext.

3. En DemoBookingPage (/demo como URL pública), usar los mismos componentes del flujo de reserva pública pero con datos del DemoContext.

4. El DashboardDemo (/demo/dashboard) muestra todos los módulos con el DemoContext:
   - Agenda con los datos en memoria, editable
   - Servicios: se puede agregar, editar, eliminar (en memoria)
   - Profesionales: ídem
   - Reportes: calculados de los turnos en memoria
   - Configuración: editable pero sin persistencia

5. Banner permanente en la parte superior (no se puede cerrar):
   "Estás en modo demo — Los datos no se guardan. ¿Listo para empezar?"
   Botón azul: "Registrarme gratis" → navega a /register

6. Al recargar la página o volver a /demo, el estado se resetea al inicial (no usar localStorage).
```

---

## PROMPT 14 — Panel Superadmin (Next.js)

```
Implementá el panel de superadmin de onClick en apps/superadmin (Next.js + TypeScript + Tailwind).

Contexto:
- Accesible en /superadmin (en el mismo dominio, manejado por Cloudflare Pages con rewrite rules)
- Usa Supabase con service_role key (server-side) para bypassear RLS
- El superadmin tiene role='superadmin' en auth.jwt()

PÁGINA: /superadmin/login
- Formulario: email + contraseña
- Autenticación con Supabase Auth
- Verificar que el usuario tenga role='superadmin' en la tabla users
- Si no tiene el rol: mostrar error "Acceso no autorizado"
- Redirigir a /superadmin/dashboard

PÁGINA: /superadmin/dashboard
Layout con sidebar: Dashboard | Tenants | Pagos Manuales | Salir

Sección Dashboard:
- 3 cards de métricas: Tenants activos | En prueba | Suspendidos
- Card: Ingresos del mes (suma de payment_history donde status='paid' y paid_at en el mes actual)
- Tabla: Últimos 5 tenants registrados (nombre, email, plan, fecha de registro)

Sección Tenants (/superadmin/tenants):
- Tabla completa con columnas: Nombre | Email | Teléfono | Plan | Estado | Método de pago | Vencimiento
- Filtros: por status (todos/trial/active/suspended/cancelled), por plan, por método de pago
- Búsqueda por nombre o email
- Acciones por fila: Habilitar (si suspendido) | Suspender (si activo/trial) | Ver detalle
- Click en una fila → /superadmin/tenants/{id}

Sección Pagos Manuales (/superadmin/pagos):
- Tabla de tenants con payment_method='manual' y subscription.status en ('trial', 'past_due', 'pending_manual_payment')
- Columnas: Nombre | Plan | Estado | Último pago | Próximo vencimiento
- Botón "Registrar pago" por fila → Modal:
  - Campos: Período (mes), Monto, Nota (opcional)
  - Al confirmar: INSERT en payment_history, UPDATE subscriptions (status='active', current_period_end=+30 días), UPDATE tenants (status='active')

Página Detalle de Tenant (/superadmin/tenants/{id}):
- Datos del negocio
- Estado actual y plan
- Historial de pagos (tabla)
- Botones: Cambiar plan (dropdown) | Suspender | Habilitar | Eliminar tenant (con doble confirmación)
```

---

## PROMPT 15 — Cloudflare Workers: webhooks y cron jobs

```
Implementá los Cloudflare Workers del proyecto onClick en la carpeta workers/.

Worker 1: workers/mp-webhook/index.ts
Webhook para eventos de Mercado Pago

- Ruta: POST /webhooks/mercadopago
- Verificar la firma del webhook con HMAC-SHA256 usando MP_WEBHOOK_SECRET
- Manejar los siguientes eventos:
  a. subscription_preapproval (status: authorized):
     → UPDATE subscriptions SET status='active', current_period_start=NOW(), current_period_end=NOW()+30d WHERE mp_subscription_id=event.id
     → UPDATE tenants SET status='active' WHERE id=tenant_id_de_la_suscripcion
     → INSERT en payment_history
  b. payment (status: approved):
     → Extender current_period_end +30 días
     → UPDATE tenants status='active' si estaba en past_due
     → INSERT en payment_history
  c. payment (status: rejected / failed):
     → UPDATE subscriptions SET status='past_due'
     → UPDATE tenants SET status='active' (mantenemos activo hasta que venza, solo mostramos modal)
  d. subscription_preapproval (status: cancelled):
     → Cuando llegue la fecha de vencimiento, se suspenderá por el cron. Registrar la cancelación.

- Usar Supabase con service_role key para todas las operaciones.

Worker 2: workers/cron/index.ts
Cron jobs programados

Job 1: Verificar trials vencidos (cron: "0 0 * * *" — diario a las 00:00 UTC)
- SELECT * FROM tenants WHERE status='trial' AND trial_ends_at < NOW()
- Por cada tenant: UPDATE tenants SET status='suspended'
- Log de cuántos tenants fueron suspendidos

Job 2: Enviar recordatorios de WhatsApp (cron: "*/15 * * * *" — cada 15 minutos)
- Consultar appointments donde:
  - status = 'confirmed'
  - whatsapp_sent = FALSE
  - starts_at está entre NOW() + (reminder_minutes - 5) y NOW() + (reminder_minutes + 5)
  - El tenant tiene whatsapp_enabled = true
- Para cada turno: llamar a Meta Cloud API con el template de recordatorio
- UPDATE appointments SET whatsapp_sent=TRUE
- El reminder_minutes se obtiene de la configuración del tenant (1h=60, 2h=120, 12h=720, 24h=1440)

Job 3: Alertar pagos manuales vencidos (cron: "0 8 * * *" — diario a las 08:00 UTC)
- SELECT tenants con payment_method='manual' y current_period_end < NOW() y status='active'
- Por cada uno: UPDATE tenants SET status='past_due' (o suspendido según regla de negocio)
- Opcional: enviar email al superadmin con la lista

Configurar wrangler.toml con los cron triggers y las variables de entorno necesarias.
```

---

## PROMPT 16 — Landing Page (Astro)

```
Implementá la landing page de onClick en apps/landing usando Astro + React Islands + Tailwind.

Paleta: navy (#0f1729), azul eléctrico (#2563eb), blanco, gris claro.
Tipografía: Inter (Google Fonts).

Secciones a implementar:

HEADER (sticky):
- Logo "onClick" (texto con icono de cursor/calendario)
- Nav: Funcionalidades | Precios | FAQs
- Botones: "Iniciar sesión" (outlined, navega a app.onclick.com/login) | "Registrarse" (solid azul, navega a app.onclick.com/register)
- En mobile: menú hamburguesa

HERO:
- Fondo: gradiente animado con CSS (navy → azul eléctrico → violeta suave)
- Headline: "Tu agenda profesional, en un click."
- Subheadline: "Gestioná turnos, profesionales y servicios desde un solo lugar. Tus clientes reservan solos."
- CTAs: "Probar 14 días gratis" (botón azul grande) | "Ver demo" (outlined, navega a /demo)
- Mockup del dashboard: imagen o componente React con screenshot/wireframe de la agenda

FUNCIONALIDADES:
- Grid de 5 cards: Agenda | Servicios | Profesionales | Reportes | Configuración
- Cada card: ícono SVG o de lucide, título, descripción de 2 líneas

PRECIOS:
- 3 cards de planes en flex row (responsive)
- Plan Pro con borde azul y badge "Más elegido"
- Cada card: nombre del plan, precio promocional + precio regular tachado, cantidad de profesionales, lista de features con ✓, botón "Empezar ahora"
- Precios:
  - Base: $9.000/mes (luego $12.000), 1 profesional
  - Pro: $22.000/mes (luego $25.000), hasta 5 profesionales
  - Premium: $40.000/mes (luego $43.000), ilimitados

FAQs (componente React Island con acordeones):
1. ¿Puedo probar onClick antes de pagar?
   → "Sí, tenés 14 días de prueba gratuita con acceso completo."
2. ¿Cómo invito profesionales a mi negocio?
   → "Desde el módulo Profesionales generás un link único. El profesional se registra y queda conectado a tu negocio."
3. ¿Mis clientes pueden sacar turnos solos?
   → "Sí. Compartís tu URL pública y tus clientes eligen servicio, profesional, fecha y hora sin que vos tengas que intervenir."
4. ¿Puedo cambiar de plan en cualquier momento?
   → "Podés mejorar de plan en cualquier momento. Para bajar de plan, el cambio se aplica en el próximo ciclo de facturación."

FOOTER:
- Logo + links de navegación + links: Términos | Privacidad
- "© 2025 onClick — Hecho con ❤️ en Argentina."

SEO básico: meta title, description, og:image en cada página.
```

---

## PROMPT 17 — Integración Mercado Pago: checkout de suscripción

```
Implementá el flujo de pago con Mercado Pago para las suscripciones de onClick.

Contexto:
- Usar la API de Suscripciones Recurrentes (preapproval) de Mercado Pago Argentina
- El flujo se inicia desde Configuración > Suscripción cuando el admin elige un plan

En el dashboard (apps/dashboard):

1. Al hacer click en "Elegir plan" → abrir ModalPlanPago con:
   - Resumen del plan elegido (nombre, precio, descripción)
   - Dos opciones de pago:
     a. "Pagar con Mercado Pago" (débito automático cada 30 días)
     b. "Pagar en efectivo o transferencia" (gestión manual por el Superadmin)
   - Botón "Continuar"

2. Si elige Mercado Pago:
   - Llamar a una Edge Function de Supabase que:
     a. Crea el preapproval en MP API: POST https://api.mercadopago.com/preapproval con:
        - reason: "onClick {plan} - {tenant_name}"
        - auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: precio, currency_id: "ARS" }
        - back_url: https://app.onclick.com/dashboard/configuracion?pago=ok
        - payer_email: email del admin
     b. Retorna el init_point (URL de checkout de MP)
   - Redirigir al admin al init_point de Mercado Pago
   - Al volver con ?pago=ok: mostrar mensaje "¡Suscripción activada! Tu plan {nombre} está activo."
   - El webhook (Worker 1 del prompt anterior) manejará la activación real

3. Si elige pago manual:
   - INSERT en subscriptions: { plan, payment_method: 'manual', status: 'pending_manual_payment' }
   - UPDATE tenants: status se mantiene en 'trial' o como esté
   - Mostrar pantalla: "Tu solicitud fue registrada. Un representante de onClick habilitará tu acceso en las próximas horas. Para pagos por transferencia, enviá el comprobante a [email de soporte]."

4. Manejo del estado past_due (pago fallido):
   - El modal de bloqueo (ya implementado en prompt 05) debe detectar subscription.status='past_due'
   - Botón "Regularizar pago": llamar a Edge Function que obtiene el link de pago pendiente de MP y redirige
```

---

## PROMPT 18 — Notificaciones WhatsApp: Meta Cloud API

```
Implementá la integración de recordatorios por WhatsApp usando Meta Cloud API en onClick.

Contexto:
- Los recordatorios se envían desde el Cloudflare Worker (ya definido en prompt 15, Job 2)
- Se usa la Meta Cloud API con Message Templates pre-aprobados

1. Creá workers/lib/whatsapp.ts con la función sendWhatsAppReminder():

Parámetros:
- phoneNumber: string (número del cliente, formato internacional: 549XXXXXXXXXX para Argentina)
- templateData: {
    client_name: string,
    business_name: string,
    fecha: string,       // "martes 10 de junio"
    hora: string,        // "14:30"
    servicio: string,
    profesional: string,
    telefono_negocio: string
  }

La función debe:
- Formatear el número argentino correctamente (agregar 549 si no está, quitar el 0 inicial si existe)
- Llamar a POST https://graph.facebook.com/v19.0/{META_PHONE_NUMBER_ID}/messages
- Headers: Authorization: Bearer {META_ACCESS_TOKEN}
- Body template:
  {
    "messaging_product": "whatsapp",
    "to": "{phoneNumber}",
    "type": "template",
    "template": {
      "name": "recordatorio_turno",
      "language": { "code": "es_AR" },
      "components": [{
        "type": "body",
        "parameters": [
          { "type": "text", "text": client_name },
          { "type": "text", "text": business_name },
          { "type": "text", "text": fecha },
          { "type": "text", "text": hora },
          { "type": "text", "text": servicio },
          { "type": "text", "text": profesional },
          { "type": "text", "text": telefono_negocio }
        ]
      }]
    }
  }
- Retornar { success: boolean, messageId?: string, error?: string }
- Manejar errores de la API (número inválido, template no aprobado, rate limit)

2. Documentar en workers/WHATSAPP_SETUP.md los pasos para:
   - Crear cuenta de WhatsApp Business en Meta for Developers
   - Crear y someter el template "recordatorio_turno" a aprobación
   - Obtener META_ACCESS_TOKEN, META_PHONE_NUMBER_ID, META_WABA_ID
   - Configurar un número de teléfono de prueba para desarrollo

3. Actualizar el Job 2 del cron worker para usar esta función.
```

---

## PROMPT 19 — Testing, variables de entorno y configuración de Cloudflare Pages

```
Configurá el despliegue completo de onClick en Cloudflare Pages y dejá el proyecto listo para producción.

1. Cloudflare Pages — Configuración de builds:

Para apps/dashboard:
- Build command: pnpm --filter dashboard build
- Output directory: apps/dashboard/dist
- Variables de entorno a configurar en el panel de CF Pages:
  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_URL, VITE_PUBLIC_URL

Para apps/landing:
- Build command: pnpm --filter landing build
- Output directory: apps/landing/dist

Para apps/superadmin:
- Build command: pnpm --filter superadmin build
- Output directory: apps/superadmin/.next

2. Cloudflare Pages — _redirects y _routes:

Creá apps/dashboard/public/_redirects:
- /* /index.html 200  (para que React Router funcione como SPA)

Creá workers/wrangler.toml completo con:
- Los dos workers (mp-webhook y cron)
- Cron triggers: "0 0 * * *" y "*/15 * * * *" y "0 8 * * *"
- Bindings de variables de entorno necesarias

3. Supabase — Edge Functions a crear:

Listá y creá el scaffold de las siguientes Edge Functions en supabase/functions/:
a. create-tenant: crea tenant + user admin al registrarse (usa service_role)
b. accept-invitation: acepta token de invitación, crea user professional (usa service_role)
c. create-mp-subscription: crea el preapproval en Mercado Pago y retorna init_point
d. check-slot-availability: verifica disponibilidad con SELECT FOR UPDATE para evitar doble reserva

Cada función debe:
- Validar el JWT del request (excepto accept-invitation que es pública con token)
- Tener manejo de errores con códigos HTTP apropiados
- Retornar JSON

4. README.md en la raíz del monorepo con:
- Descripción del proyecto
- Requisitos previos (Node 18+, pnpm, cuenta Supabase, cuenta Cloudflare, cuenta MP developer)
- Pasos para correr en desarrollo
- Pasos para desplegar en producción
- Diagrama simple de arquitectura en texto
```

---

## PROMPT 20 — Polish final: accesibilidad, responsive y optimizaciones

```
Revisá y mejorá el proyecto onClick con los siguientes ajustes de calidad final.

1. Responsive mobile-first en el dashboard:
   - El sidebar en mobile se convierte en bottom navigation bar (5 íconos en fila inferior)
   - La agenda en mobile muestra solo el profesional seleccionado (dropdown para cambiar de profesional)
   - Los modales en mobile ocupan el 100% del alto de la pantalla (bottom sheet)
   - Las cards de servicios y profesionales en mobile son 1 columna
   - Los reportes en mobile apilan verticalmente las cards y gráficos

2. Accesibilidad básica:
   - Todos los botones tienen aria-label descriptivos
   - Los modales tienen role="dialog" y aria-modal="true" con focus trap
   - Los inputs tienen labels asociados correctamente
   - El contraste de colores cumple WCAG AA (verificar especialmente el sidebar oscuro)
   - Navegación por teclado funcional en los modales y dropdowns

3. Performance:
   - Lazy loading de las páginas del dashboard con React.lazy + Suspense
   - Las queries a Supabase usan select() con los campos necesarios (no SELECT *)
   - Implementar React Query (TanStack Query) o SWR para cachear y sincronizar los datos de servicios y profesionales (que cambian poco)
   - La grilla de la agenda solo re-renderiza las celdas afectadas por los cambios de Realtime

4. UX pequeños detalles:
   - Skeleton loaders en todas las vistas mientras cargan datos (no spinners)
   - Toast notifications para acciones exitosas (creación/edición/eliminación) usando una librería simple o implementación propia
   - Confirmaciones destructivas (eliminar, cancelar turno) usan un Dialog de confirmación, no window.confirm()
   - Scroll automático al top al navegar entre módulos
   - El campo de slug en onboarding y configuración muestra en tiempo real: "Tu URL pública será: onclick.com/tu-negocio"

5. Manejo de errores global:
   - Error boundary en el DashboardLayout que captura errores no manejados y muestra una pantalla de error con botón "Recargar"
   - Todos los fetch a Supabase tienen manejo de error con mensaje amigable al usuario
   - Si la sesión expira, redirigir a /login con mensaje "Tu sesión expiró. Iniciá sesión nuevamente."
```

---

*Guía generada para onClick v1.0 — 20 prompts secuenciales*
*Stack: React + Vite + Supabase + Cloudflare + Astro + Next.js + Tailwind*

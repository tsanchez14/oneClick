# onClick — Especificaciones Técnicas del Proyecto

> Versión 1.0 | Sistema de agenda online para negocios de servicios

---

## Índice

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Tipos de Usuario y Roles](#4-tipos-de-usuario-y-roles)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Módulos del Sistema](#6-módulos-del-sistema)
7. [URL Pública del Negocio](#7-url-pública-del-negocio)
8. [Sistema de Planes y Suscripciones](#8-sistema-de-planes-y-suscripciones)
9. [Métodos de Cobro](#9-métodos-de-cobro)
10. [Notificaciones por WhatsApp](#10-notificaciones-por-whatsapp)
11. [Demo sin Registro](#11-demo-sin-registro)
12. [Landing Page](#12-landing-page)
13. [Panel Superadmin](#13-panel-superadmin)
14. [Configuración Inicial del Negocio (Onboarding)](#14-configuración-inicial-del-negocio-onboarding)
15. [Período de Prueba Gratuito](#15-período-de-prueba-gratuito)
16. [Flujos Principales](#16-flujos-principales)
17. [Seguridad y Multi-tenancy](#17-seguridad-y-multi-tenancy)
18. [Despliegue e Infraestructura](#18-despliegue-e-infraestructura)
19. [Contraseña](Mol7kWTjNraKPgcR)

---

## 1. Visión General

**onClick** es un SaaS de agenda online orientado a negocios de servicios (peluquerías, barberías, centros de estética, consultorios, etc.). Permite a los dueños o administradores gestionar turnos, profesionales y servicios desde un panel centralizado, mientras que sus clientes pueden reservar turnos en línea a través de una URL pública única por negocio.

### Objetivos principales

- Eliminar la gestión manual de turnos por WhatsApp o teléfono.
- Ofrecer visibilidad en tiempo real de la agenda para todos los profesionales.
- Proveer una experiencia de reserva simple y rápida para los clientes finales.
- Escalar a múltiples negocios bajo un modelo SaaS multi-tenant.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Landing Page | Astro + React Islands + TypeScript | Rendimiento estático óptimo para SEO |
| Sistema / Dashboard | React SPA + Vite + TypeScript | Interactividad compleja del dashboard |
| Panel Superadmin | Next.js + TypeScript | Rutas protegidas, SSR para datos sensibles |
| Base de datos | Supabase (PostgreSQL) | Multi-tenant, Auth, Realtime, Storage |
| Auth | Supabase Auth | JWT, invitaciones por email, roles |
| Pagos automáticos | Mercado Pago API (Argentina) | Suscripciones recurrentes |
| Notificaciones | Meta Cloud API (WhatsApp) | Recordatorios de turnos |
| CDN / Hosting | Cloudflare Pages + Workers | Global, rápido, barato |
| Backend / Edge functions | Cloudflare Workers + Node.js | Webhooks, lógica de negocio |
| Estilos | Tailwind CSS | Utilidad, consistencia, velocidad |
| Tipografía | Inter (Google Fonts) | Legibilidad, modernidad |

### Estructura de repositorio sugerida

```
onclick/
├── apps/
│   ├── landing/          # Astro — landing page pública
│   ├── dashboard/        # React SPA — sistema para admin y profesionales
│   └── superadmin/       # Next.js — panel de superadministrador
├── packages/
│   ├── ui/               # Componentes compartidos
│   ├── types/            # TypeScript types compartidos
│   └── utils/            # Funciones utilitarias compartidas
├── supabase/
│   ├── migrations/       # Migraciones SQL
│   ├── functions/        # Edge functions de Supabase
│   └── seed.sql          # Datos iniciales
└── workers/              # Cloudflare Workers (webhooks, cron)
```

---

## 3. Arquitectura del Sistema

### Multi-tenancy con Supabase

Cada negocio registrado en onClick es un **tenant** independiente. La separación de datos se implementa mediante **Row Level Security (RLS)** en PostgreSQL, usando una columna `tenant_id` en todas las tablas relacionadas al negocio.

```
Supabase (único proyecto)
├── Auth (usuarios de todos los tenants)
├── PostgreSQL
│   ├── tabla: tenants          ← un registro por negocio
│   ├── tabla: users            ← vincula user con tenant y rol
│   ├── tabla: professionals    ← tenant_id FK
│   ├── tabla: services         ← tenant_id FK
│   ├── tabla: appointments     ← tenant_id FK
│   └── tabla: subscriptions    ← tenant_id FK
└── RLS policies                ← aíslan datos por tenant_id
```

### Flujo de autenticación

1. El usuario se autentica con Supabase Auth (JWT).
2. El JWT contiene el `tenant_id` y el `role` en los claims.
3. Cada query a la base de datos filtra automáticamente por `tenant_id` vía RLS.
4. El Superadmin tiene un rol especial que bypasea RLS.

---

## 4. Tipos de Usuario y Roles

### 4.1 Superadmin

- Rol: `superadmin`
- Acceso: Panel propio en `/superadmin` (parte del proyecto Next.js).
- Capacidades:
  - Ver todos los tenants registrados con nombre, email, teléfono y plan activo.
  - Habilitar, suspender o eliminar un tenant manualmente.
  - Registrar pagos en efectivo o por transferencia para habilitar o extender acceso.
  - Ver el estado de suscripción de cada tenant (activo, vencido, prueba, suspendido).

### 4.2 Admin (dueño del negocio)

- Rol: `admin`
- Es el usuario que se registra y paga el sistema.
- Capacidades:
  - Acceso completo a todos los módulos: Agenda, Servicios, Profesionales, Reportes, Configuración.
  - Invitar profesionales mediante un link único.
  - Configurar el negocio: nombre, teléfono, días y horarios de trabajo, servicios.
  - Gestionar suscripción y método de pago.
  - Activar/desactivar recordatorios por WhatsApp para clientes.

### 4.3 Profesional (invitado)

- Rol: `professional`
- Es invitado por el Admin mediante un link.
- Capacidades:
  - Ver la agenda completa del negocio (todas las columnas/profesionales).
  - Modificar únicamente los turnos asignados a sí mismo.
  - Ver sus propios reportes.
  - **No puede** acceder a: módulo de Servicios, módulo de Profesionales, Configuración, ni invitar a otros.

### 4.4 Cliente final

- No tiene cuenta en el sistema.
- Accede a la URL pública del negocio.
- Ingresa su nombre y teléfono para confirmar una reserva.
- Su información queda guardada en la tabla `clients` vinculada al tenant.

---

## 5. Modelo de Datos

### Tablas principales

```sql
-- Tenants (negocios registrados)
tenants (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,  -- usado en la URL pública: onclick.com/negocio
  phone           TEXT,
  email           TEXT,
  logo_url        TEXT,
  working_days    INT[] DEFAULT '{1,2,3,4,5}',  -- 0=Dom, 1=Lun...
  open_time       TIME DEFAULT '09:00',
  close_time      TIME DEFAULT '18:00',
  status          TEXT DEFAULT 'trial',  -- trial | active | suspended | cancelled
  trial_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Usuarios del sistema (admin y profesionales)
users (
  id              UUID PRIMARY KEY REFERENCES auth.users,
  tenant_id       UUID REFERENCES tenants(id),
  role            TEXT NOT NULL,  -- admin | professional | superadmin
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Invitaciones pendientes de profesionales
invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  token           TEXT UNIQUE NOT NULL,
  email           TEXT,
  expires_at      TIMESTAMPTZ,
  used_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id)
)

-- Servicios del negocio
services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  name            TEXT NOT NULL,
  duration_slots  INT NOT NULL,  -- cantidad de celdas de 15min
  price           NUMERIC(10,2),
  color           TEXT,          -- color para identificar en agenda
  is_active       BOOLEAN DEFAULT TRUE
)

-- Profesionales (extensión del user con datos del negocio)
professionals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  display_name    TEXT,
  specialty       TEXT,
  is_available    BOOLEAN DEFAULT TRUE
)

-- Clientes finales (sin cuenta, por tenant)
clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
)

-- Turnos / citas
appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  professional_id   UUID REFERENCES professionals(id),
  service_id        UUID REFERENCES services(id),
  client_id         UUID REFERENCES clients(id),
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  status            TEXT DEFAULT 'confirmed',  -- confirmed | cancelled | blocked | no_show
  notes             TEXT,
  booked_from       TEXT DEFAULT 'system',     -- system | public_url
  whatsapp_sent     BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

-- Bloqueos de tiempo (imprevistos)
time_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  professional_id UUID REFERENCES professionals(id),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  reason          TEXT
)

-- Suscripciones
subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID REFERENCES tenants(id),
  plan                  TEXT NOT NULL,  -- base | pro | premium
  status                TEXT DEFAULT 'trial',  -- trial | active | past_due | cancelled
  payment_method        TEXT,           -- mercadopago | manual
  mp_subscription_id    TEXT,           -- ID de suscripción en Mercado Pago
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  promo_ends_at         TIMESTAMPTZ,    -- fin del período promocional (3 meses)
  created_at            TIMESTAMPTZ DEFAULT NOW()
)

-- Historial de pagos
payment_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount          NUMERIC(10,2),
  method          TEXT,        -- mercadopago | manual
  status          TEXT,        -- paid | failed | refunded
  paid_at         TIMESTAMPTZ,
  notes           TEXT         -- para pagos manuales
)
```

---

## 6. Módulos del Sistema

### 6.1 Agenda

**Vista principal:** Grilla semanal con columnas por profesional y filas de 15 minutos.

**Comportamiento de las celdas:**
- Cada celda representa un slot de 15 minutos.
- Al hacer clic en una celda libre → se abre un **modal para crear turno**.
- Al hacer clic en una celda ocupada → se abre el **detalle del turno**.
- Se pueden seleccionar múltiples celdas consecutivas (click + drag o shift+click) para **bloquear un rango de tiempo** por imprevistos.

**Modal para crear turno (admin):**
1. Buscador de cliente por nombre o teléfono.
2. Si no existe → opción "Agendar como nuevo cliente" (nombre + teléfono).
3. Selector de servicio (muestra nombre, duración y precio).
4. El turno ocupa automáticamente la cantidad de slots según `duration_slots` del servicio.
5. Selector de profesional (pre-seleccionado si se hizo clic en su columna).
6. Campo de notas opcional.
7. Botón confirmar.

**Modal para crear turno (profesional):**
- Solo puede crear turnos en su propia columna.
- Misma lógica que el admin pero limitado a su perfil.

**Modal de bloqueo de tiempo:**
- Confirmar el rango seleccionado.
- Campo de motivo opcional.
- El bloqueo aparece visualmente diferenciado en la agenda (color grisado con ícono de candado).

**Navegación:**
- Botones anterior/siguiente semana.
- Ir a hoy.
- Selector de fecha.

**Sincronización en tiempo real:**
- Usar Supabase Realtime para que los cambios de un profesional se reflejen instantáneamente en la vista de todos los demás.

---

### 6.2 Servicios

- Solo accesible para el Admin.
- Vista en tarjetas (grid).
- Cada tarjeta muestra: nombre del servicio, duración (en minutos, calculada de `duration_slots * 15`), precio y color identificador.
- Acciones por tarjeta: editar, activar/desactivar, eliminar.
- Botón "Agregar servicio" → modal con formulario:
  - Nombre del servicio.
  - Duración (selector: 15, 30, 45, 60, 90, 120 min o ingreso manual).
  - Precio.
  - Color (paleta predefinida de colores).

---

### 6.3 Profesionales

- Solo accesible para el Admin.
- Vista en tarjetas con foto/avatar, nombre, especialidad y estado (disponible/no disponible).
- Toggle para activar/desactivar disponibilidad de un profesional.
- Botón "Invitar profesional" → genera un link único con token que expira en 48 horas.
  - El link se puede copiar o compartir directamente por WhatsApp (botón que abre `wa.me` con el link pre-cargado).
  - Al acceder al link, el profesional se registra con nombre y contraseña y queda vinculado al tenant automáticamente.
- Límite de invitaciones activas según el plan contratado.

---

### 6.4 Reportes

**Admin ve:**
- Resumen total del negocio: turnos del período, ingresos estimados, clientes atendidos.
- Gráfico de barras: turnos por día de la semana.
- Gráfico de torta: distribución por servicio.
- Tabla: rendimiento por profesional (turnos, servicios más solicitados).
- Filtro por rango de fechas.

**Profesional ve:**
- Solo sus propios datos: turnos del período, servicios realizados, clientes atendidos.
- Mismos gráficos pero filtrados a su perfil.

---

### 6.5 Configuración

**Secciones (solo Admin):**

**Negocio:**
- Nombre del negocio.
- Teléfono de contacto.
- Logo (upload a Supabase Storage).
- Días de la semana habilitados (checkboxes Lun–Dom).
- Horario de apertura y cierre.
- Slug / URL pública (editable, con validación de unicidad).

**Notificaciones:**
- Toggle: activar recordatorios por WhatsApp a clientes.
- Tiempo de anticipación del recordatorio (1h, 2h, 12h, 24h antes del turno).

**Suscripción:**
- Si está en período de prueba: mostrar los 3 planes con precios y botones para elegir.
- Si tiene plan activo:
  - Detalle del plan actual (nombre, precio, próximo vencimiento, método de pago).
  - Botón "Mejorar plan" (solo permite subir, con modal de confirmación).
  - Botón "Cambiar a plan inferior" (con advertencia de pérdida de funcionalidades).
  - Botón "Cancelar suscripción" (con confirmación y fecha hasta la que mantiene acceso).

---

## 7. URL Pública del Negocio

Cada negocio tiene una URL pública con su slug: `https://onclick.com/{slug}`

### Flujo de reserva para el cliente final

1. El cliente accede a la URL pública del negocio.
2. Ve el nombre del negocio y el logo.
3. **Paso 1 — Elegir servicio:** Lista de servicios activos con nombre, duración y precio.
4. **Paso 2 — Elegir profesional:** Lista de profesionales disponibles. Opción "Sin preferencia" (asigna al primero disponible).
5. **Paso 3 — Elegir fecha y hora:** Calendario con días habilitados por el negocio. Al seleccionar un día, muestra los slots disponibles en base a la agenda del sistema (excluyendo turnos ya tomados y bloqueos).
6. **Paso 4 — Confirmar datos:** Formulario con nombre completo y teléfono.
   - Si el teléfono ya existe en el tenant → usa el nombre guardado (editable).
   - Si no existe → crea un nuevo cliente.
7. **Confirmación:** Pantalla de éxito con resumen del turno (servicio, profesional, fecha, hora).
8. El turno aparece inmediatamente en la agenda del sistema (Supabase Realtime).
9. Si el admin tiene WhatsApp activado → se envía recordatorio automático antes del turno.

### Validaciones anti-colisión

- Al mostrar los slots disponibles en el paso 3, la lógica consulta en tiempo real los turnos confirmados y bloqueos del profesional seleccionado para esa fecha.
- Los slots ocupados no se muestran.
- Si dos clientes intentan reservar el mismo slot simultáneamente, se utiliza una transacción con `SELECT FOR UPDATE` en PostgreSQL para garantizar que solo uno lo confirme.

---

## 8. Sistema de Planes y Suscripciones

### Planes disponibles

| Plan | Precio regular | Precio primeros 3 meses | Profesionales | Funcionalidades |
|---|---|---|---|---|
| **Base** | $12.000/mes | $9.000/mes | 1 (solo el Admin) | Agenda, Reservas online, Asistencia técnica |
| **Pro** | $25.000/mes | $22.000/mes | Hasta 5 (Admin + 4 invitados) | Agenda, Reservas online, Asistencia y soporte técnico |
| **Premium** | $43.000/mes | $40.000/mes | Ilimitados | Agenda, Reservas online, Asistencia y soporte prioritario |

### Lógica de precios promocionales

- Al registrarse y elegir un plan, el sistema registra `promo_ends_at = NOW() + 3 months`.
- Durante ese período, se cobra el precio promocional.
- Al vencer, el cobro automático pasa al precio regular sin intervención manual.
- La lógica de precio se calcula en el Cloudflare Worker al momento de crear/renovar la suscripción en Mercado Pago.

### Límite de profesionales por plan

- Se valida al intentar generar un nuevo link de invitación.
- Si el tenant está en el plan Base, el botón "Invitar profesional" está deshabilitado con un tooltip explicativo.

---

## 9. Métodos de Cobro

### 9.1 Mercado Pago (automático)

- Se usa la API de **Suscripciones Recurrentes** de Mercado Pago Argentina.
- Al elegir un plan, el admin es redirigido al checkout de Mercado Pago para autorizar el débito automático.
- Mercado Pago cobra automáticamente cada 30 días.
- Se implementa un **webhook** en un Cloudflare Worker que escucha los eventos de Mercado Pago:
  - `subscription_authorized` → habilitar tenant, actualizar `subscriptions`.
  - `payment_created` (status: approved) → registrar en `payment_history`, extender `current_period_end`.
  - `payment_created` (status: rejected/failed) → marcar suscripción como `past_due`, mostrar modal de bloqueo.
  - `subscription_cancelled` → suspender tenant al vencer el período actual.

**Modal de acceso bloqueado por pago fallido:**
- Cubre toda la pantalla del sistema (no se puede cerrar).
- Mensaje: "Tu suscripción tiene un pago pendiente. Regularizá tu situación para continuar usando onClick."
- Botón: "Regularizar pago" → redirige al link de pago de Mercado Pago.

### 9.2 Pago manual (efectivo o transferencia)

- El admin elige este método durante la selección de plan.
- El sistema queda en estado `pending_manual_payment`.
- El Superadmin ve en su panel los tenants con pagos manuales pendientes.
- El Superadmin puede:
  - **Habilitar** el acceso por 30 días (registra el pago en `payment_history`).
  - **Suspender** manualmente si no recibe el pago.
- No hay automatización: la renovación depende del Superadmin.

---

## 10. Notificaciones por WhatsApp

### Tecnología: Meta Cloud API (WhatsApp Business Platform)

- **Tipo de mensajes:** Message Templates (pre-aprobados por Meta).
- **Template sugerido para recordatorio:**

```
Hola {nombre_cliente}! 👋
Te recordamos que tenés un turno en *{nombre_negocio}*:

📅 Fecha: {fecha}
⏰ Hora: {hora}
✂️ Servicio: {servicio}
👤 Profesional: {profesional}

Si necesitás cancelar o reprogramar, comunicate al {telefono_negocio}.
```

### Flujo de envío

1. Al confirmarse un turno (desde la agenda o desde la URL pública), se agenda un job en Supabase Edge Function o Cloudflare Worker con el tiempo configurado por el admin.
2. Al llegar el momento, el worker llama a la Meta Cloud API con el template y los datos del turno.
3. Se registra el resultado en `appointments.whatsapp_sent`.

### Configuración

- El admin activa/desactiva esta funcionalidad desde el módulo de Configuración.
- Si está desactivada, no se envían mensajes aunque el turno se confirme.
- El número de WhatsApp Business es uno por instalación de onClick (compartido entre tenants), no por negocio. Considerar número dedicado por tenant como mejora futura.

---

## 11. Demo sin Registro

### Acceso

- Botón "Ver demo" en la landing page.
- Redirige a `https://onclick.com/demo`.

### Comportamiento

- Carga un tenant aislado en memoria (sin persistencia en Supabase).
- El tenant demo tiene datos pre-cargados: 3 servicios, 2 profesionales, algunos turnos de ejemplo.
- El usuario puede:
  - Navegar por todos los módulos.
  - Crear, editar y eliminar turnos (solo en memoria).
  - Explorar la agenda, servicios, reportes y configuración.
- Al recargar la página o cerrar el navegador, los datos vuelven al estado inicial.
- Un banner superior indica permanentemente: "Estás en modo demo. Los datos no se guardan. ¿Listo para empezar?" + botón "Registrarme gratis".
- La URL pública del negocio demo también funciona en modo aislado.

---

## 12. Landing Page

Desarrollada en **Astro** con componentes interactivos en React Islands.

### Secciones

**Header (sticky):**
- Logo "onClick".
- Nav: Servicios | Precios | FAQs.
- Botones: "Iniciar sesión" (outlined) | "Registrarse" (solid).

**Hero:**
- Fondo: gradiente abstracto animado (navy + electric blue + violeta).
- Headline: "Tu agenda profesional, en un click."
- Subheadline: "Gestioná turnos, profesionales y servicios desde un solo lugar."
- CTAs: "Probar 14 días gratis" | "Ver demo".
- Mockup flotante del dashboard a la derecha.

**Servicios:**
- 5 tarjetas: Agenda, Servicios, Profesionales, Reportes, Configuración.
- Cada una con ícono, título y descripción de 2 líneas.

**Precios:**
- 3 tarjetas con los planes (ver sección 8).
- Plan Pro destacado con borde azul y badge "Más elegido".
- Precios mostrando el promocional tachado y el regular, o viceversa (a definir en diseño).

**FAQs:**
- 4 acordeones desplegables:
  1. ¿Puedo probar onClick antes de pagar?
  2. ¿Cómo invito profesionales a mi negocio?
  3. ¿Mis clientes pueden sacar turnos solos?
  4. ¿Puedo cambiar de plan en cualquier momento?

**Footer:**
- Logo, links de navegación, redes sociales.
- Copyright + "Hecho con ❤️ en Argentina."

---

## 13. Panel Superadmin

Desarrollado en **Next.js**, accesible en `/superadmin` con login propio.

### Autenticación

- Usuario y contraseña propios (Supabase Auth con rol `superadmin`).
- No comparte sesión con los tenants.

### Funcionalidades

**Dashboard:**
- Total de tenants activos, en prueba, suspendidos.
- Ingresos del mes (suma de pagos registrados).
- Últimos tenants registrados.

**Tabla de tenants:**
- Columnas: Nombre, Email, Teléfono, Plan, Estado, Método de pago, Fecha de vencimiento.
- Acciones por fila: Habilitar | Suspender | Eliminar.
- Filtros: por estado, por plan, por método de pago.

**Gestión de pagos manuales:**
- Lista de tenants con pago manual pendiente.
- Botón "Registrar pago" → seleccionar período, monto y nota.
- Historial de pagos por tenant.

**Detalle de tenant:**
- Ver toda la información del negocio.
- Historial de pagos.
- Cambiar plan manualmente.
- Acciones de estado.

---

## 14. Configuración Inicial del Negocio (Onboarding)

Al completar el registro, el Admin es redirigido a un **wizard de onboarding** antes de acceder al sistema.

### Pasos del wizard

**Paso 1 — Datos del negocio:**
- Nombre del negocio (obligatorio).
- Teléfono de contacto (obligatorio).
- Logo (opcional, se puede agregar después).
- URL pública / slug (se sugiere automáticamente del nombre, editable).

**Paso 2 — Días y horarios:**
- Checkboxes para seleccionar días de la semana habilitados.
- Selector de horario de apertura y cierre.
- Vista previa de la grilla resultante.

**Paso 3 — Servicios:**
- Formulario para agregar servicios (nombre, duración, precio, color).
- Botón "Agregar otro servicio".
- Mínimo 1 servicio requerido para continuar.

**Paso 4 — Resumen:**
- Resumen de la configuración realizada.
- Botón "Ir a mi agenda" → acceso al sistema.

> ⚠️ El wizard no incluye el paso de invitar profesionales. Eso se hace desde el módulo de Profesionales una vez dentro del sistema.

---

## 15. Período de Prueba Gratuito

- Duración: **14 días** desde el registro.
- Estado inicial del tenant: `trial`.
- El campo `trial_ends_at` se establece en `NOW() + 14 days` al crear el tenant.
- Durante la prueba, el admin tiene acceso completo al sistema sin restricciones de plan (se comporta como el plan Premium).

### Modal de prueba gratuita

- Se muestra en la parte superior del sistema (similar al banner de Claude).
- Contenido: "Estás en tu período de prueba gratuito. Te quedan **X días**. Elegí un plan para continuar."
- Botón: "Ver planes" → redirige a Configuración > Suscripción.
- El modal no bloquea el uso del sistema, solo informa.

### Vencimiento de la prueba

- Un Cloudflare Worker con cron job revisa diariamente los tenants con `trial_ends_at < NOW()`.
- Al vencer, el tenant pasa a estado `suspended`.
- El sistema muestra el modal de bloqueo con la opción de elegir un plan.

---

## 16. Flujos Principales

### Flujo 1: Registro de nuevo negocio

```
Landing → Registrarse → Formulario (nombre, email, contraseña)
→ Verificación de email → Onboarding wizard (4 pasos)
→ Dashboard (período de prueba activo, 14 días)
```

### Flujo 2: Invitación de profesional

```
Admin → Módulo Profesionales → "Invitar profesional"
→ Sistema genera link con token (expira en 48h)
→ Admin copia el link o lo comparte por WhatsApp
→ Profesional accede al link → Formulario (nombre, contraseña)
→ Profesional queda vinculado al tenant → Accede al dashboard con rol "professional"
```

### Flujo 3: Reserva desde URL pública

```
Cliente accede a onclick.com/{slug}
→ Elige servicio → Elige profesional → Elige fecha y hora disponible
→ Ingresa nombre y teléfono → Confirma reserva
→ Turno aparece en la agenda del sistema (Realtime)
→ Si WhatsApp está activado → recordatorio programado
```

### Flujo 4: Pago automático con Mercado Pago

```
Admin elige plan → Redirect a checkout MP → Autoriza débito automático
→ MP webhook → Worker habilita tenant → Cada 30 días MP cobra automáticamente
→ Si pago falla → tenant pasa a "past_due" → modal de bloqueo en el sistema
→ Admin regulariza → MP reintenta → webhook habilita nuevamente
```

### Flujo 5: Bloqueo de tiempo en agenda

```
Admin o Profesional → Selecciona múltiples celdas en la agenda (click + drag)
→ Modal de confirmación: "¿Bloquear este rango?" + campo de motivo
→ Confirma → Las celdas se muestran bloqueadas (grisadas, ícono de candado)
→ Esas celdas no están disponibles en la URL pública del negocio
```

---

## 17. Seguridad y Multi-tenancy

### Row Level Security (RLS)

Todas las tablas relacionadas al negocio tienen RLS activo. Ejemplo para `appointments`:

```sql
CREATE POLICY "tenant_isolation" ON appointments
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Políticas por rol

```sql
-- Profesionales solo ven sus propios turnos para modificar
CREATE POLICY "professional_own_appointments" ON appointments
  FOR UPDATE USING (
    professional_id = auth.jwt() ->> 'professional_id'
    AND tenant_id = auth.jwt() ->> 'tenant_id'
  );
```

### Validaciones adicionales

- Tokens de invitación: firmados, con expiración de 48 horas, uso único.
- Slug de tenant: validación de unicidad y caracteres permitidos (`[a-z0-9-]`).
- Todos los inputs sanitizados antes de insertar en la base de datos.
- Rate limiting en las rutas públicas (Cloudflare Workers).

---

## 18. Despliegue e Infraestructura

| Componente | Servicio | URL |
|---|---|---|
| Landing | Cloudflare Pages | `onclick.com` |
| Dashboard (React SPA) | Cloudflare Pages | `app.onclick.com` |
| Superadmin (Next.js) | Cloudflare Pages | `onclick.com/superadmin` |
| URL pública negocios | Cloudflare Pages | `onclick.com/{slug}` |
| Base de datos | Supabase | Proyecto único |
| Edge Functions | Supabase Functions | Notificaciones, validaciones |
| Webhooks y Cron | Cloudflare Workers | Pagos MP, recordatorios WA, expiración trials |
| Storage (logos) | Supabase Storage | Bucket `tenant-assets` |

### Variables de entorno necesarias

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mercado Pago
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=

# Meta Cloud API (WhatsApp)
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_WABA_ID=

# App
APP_URL=https://app.onclick.com
PUBLIC_URL=https://onclick.com
```

### Cron Jobs (Cloudflare Workers)

| Job | Frecuencia | Función |
|---|---|---|
| Verificar trials vencidos | Diario 00:00 | Suspender tenants con `trial_ends_at < NOW()` |
| Enviar recordatorios WA | Cada 15 min | Consultar turnos próximos y enviar mensajes |
| Verificar pagos manuales vencidos | Diario 08:00 | Alertar al Superadmin de tenants vencidos |

---

*Documento generado como especificación base para el desarrollo de onClick v1.0*
*Revisión y ajustes antes del inicio del desarrollo son bienvenidos.*
*Credenciales de supabase
Usuario: onClick
Contraseña: GMHNtyVVzyZFAjfL*

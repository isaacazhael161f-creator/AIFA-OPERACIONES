# Diagramas Mermaid - Arquitectura Actual AIFA Operaciones

Fecha: 2026-07-22

Estos diagramas documentan la arquitectura observada en el repositorio AIFA Operaciones. No agregan modulos nuevos ni describen componentes hipoteticos; usan secciones, archivos, tablas, RPCs y funciones detectadas en el codigo y SQL del repo.

## 1. Vista General

```mermaid
flowchart TB
  User["Usuario AIFA Operaciones"]
  Browser["Navegador / PWA"]
  Index["index.html"]
  Script["script.js"]
  JSModules["js/*.js"]
  Server["server.js Express estatico"]
  SupabaseClient["js/supabase-client.js"]
  Supabase["Supabase"]
  Auth["Supabase Auth"]
  DB["Postgres public schema"]
  RLS["RLS / Policies"]
  RPC["RPCs"]
  Storage["Storage buckets"]
  Realtime["Realtime postgres_changes"]
  EdgeFunctions["Supabase Edge Functions"]

  User --> Browser
  Browser --> Index
  Browser --> Server
  Index --> Script
  Index --> JSModules
  Script --> SupabaseClient
  JSModules --> SupabaseClient
  SupabaseClient --> Supabase
  Supabase --> Auth
  Supabase --> DB
  Supabase --> RPC
  Supabase --> Storage
  Supabase --> Realtime
  Supabase --> EdgeFunctions
  DB --> RLS
  RLS --> DB
```

## 2. Frontend y Navegacion por Secciones

```mermaid
flowchart LR
  Index["index.html"]
  Sidebar["#sidebar-nav"]
  MenuItem[".menu-item[data-section]"]
  ShowSection["showSection(sectionKey, linkEl) en script.js"]
  Content[".content-section"]
  NavDeck["js/navigation.js"]
  PermissionsUI["js/permissions.js + applySectionPermissions"]

  Index --> Sidebar
  Sidebar --> MenuItem
  MenuItem --> ShowSection
  ShowSection --> Content
  NavDeck --> Sidebar
  PermissionsUI --> MenuItem
  PermissionsUI --> Content
```

## 3. Modulos JS por Dominio

```mermaid
flowchart TB
  Index["index.html carga scripts"]
  Core["js/core.js"]
  SupabaseClient["js/supabase-client.js"]
  Realtime["js/realtime.js"]
  Navigation["js/navigation.js"]
  Permissions["js/permissions.js"]
  Notifications["js/notifications.js"]

  Ops["Operaciones: script.js, js/operaciones.js, js/parte-ops-tab.js, js/parte-ops-flights.js, js/analisis-mensual.js, js/analisis-anual.js"]
  Itinerary["Itinerario/FIDS: js/itinerario.js, js/itinerario-tab.js, js/fids.js"]
  Manifests["Manifiestos: js/manifiestos.js, js/manifiestos_pax.js, js/manifiestos-carga.js, js/portal-manifiestos.js"]
  Agenda["Agenda: js/agenda.js, js/agenda-assistant.js"]
  Admin["Admin: script.js, js/admin-ui.js, js/data-management.js"]
  Biblioteca["Biblioteca: #biblioteca-section en index.html"]
  Services["Servicios: js/fauna.js, js/medicas.js, js/hvac.js, js/ssei-derrames.js, js/ssei-emergencias.js"]

  Index --> Core
  Index --> SupabaseClient
  Index --> Realtime
  Index --> Navigation
  Index --> Permissions
  Index --> Notifications
  Index --> Ops
  Index --> Itinerary
  Index --> Manifests
  Index --> Agenda
  Index --> Admin
  Index --> Biblioteca
  Index --> Services
```

## 4. Supabase: Datos, RPC, Storage, Realtime y Functions

```mermaid
flowchart TB
  Client["Frontend JS"]
  SB["window.supabaseClient"]
  Auth["Supabase Auth"]
  DB["Postgres public"]
  RLS["RLS"]
  RPC["RPC"]
  Storage["Storage"]
  RT["Realtime"]
  Edge["Edge Functions"]

  Client --> SB
  SB --> Auth
  SB --> DB
  SB --> RPC
  SB --> Storage
  SB --> RT
  Edge --> DB
  Edge --> Storage
  DB --> RLS

  subgraph Tables["Tablas y vistas usadas por modulos"]
    T1["user_roles"]
    T2["usuarios_aplicaciones"]
    T3["aplicaciones"]
    T4["flights"]
    T5["parte_operations"]
    T6["vuelos_parte_operaciones"]
    T7["custom_parte_operaciones"]
    T8["Conciliacion Manifiestos"]
    T9["manifiestos_pasajeros"]
    T10["manifiestos_pdfs"]
    T11["agenda_comites"]
    T12["agenda_reuniones"]
    T13["agenda_acuerdos"]
    T14["agenda_temas"]
    T15["agenda_2026"]
    T16["push_subscriptions"]
    T17["whatsapp_alertas"]
    T18["areas"]
  end

  DB --> Tables
```

## 5. Autenticacion y Compuerta OPERACIONES

```mermaid
sequenceDiagram
  actor User as Usuario
  participant UI as Login UI index.html/script.js
  participant SB as Supabase Client
  participant Auth as Supabase Auth
  participant Apps as usuarios_aplicaciones
  participant Roles as user_roles
  participant Session as sessionStorage
  participant App as main-app

  User->>UI: Ingresa credenciales
  UI->>SB: ensureSupabaseClient()
  SB->>Auth: auth.signInWithPassword()
  Auth-->>SB: session + user
  SB->>Apps: select app OPERACIONES activa
  SB->>Roles: select role / permissions
  UI->>Session: guarda token, role, allowed_sections, area
  UI->>App: muestra main-app si tiene acceso
  UI->>User: error si no tiene acceso OPERACIONES
```

## 6. RLS y Modelo de Permisos

```mermaid
flowchart TB
  AuthUser["auth.uid()"]
  UserRoles["user_roles"]
  Perms["permissions JSON"]
  Allowed["allowed_sections"]
  Levels["section_levels"]
  Apps["usuarios_aplicaciones"]
  Helpers["user_can_edit_section / user_can_capture_section / user_can_view_section"]
  RLS["RLS Policies"]
  Tables["Tablas public"]
  UI["Visibilidad UI"]

  AuthUser --> UserRoles
  UserRoles --> Perms
  Perms --> Allowed
  Perms --> Levels
  AuthUser --> Apps
  Allowed --> UI
  Levels --> Helpers
  UserRoles --> Helpers
  Helpers --> RLS
  Apps --> RLS
  RLS --> Tables
```

## 7. Administracion de Usuarios

```mermaid
flowchart TB
  AdminUI["admin-usuarios-section / script.js"]
  Supabase["window.supabaseClient"]
  ViewUsers["v_usuarios_roles"]
  Roles["user_roles"]
  Areas["areas"]
  Apps["usuarios_aplicaciones"]
  CreateRole["RPC admin_create_user_role"]
  UpdateRole["RPC admin_update_user_role"]
  UpdatePerms["RPC admin_update_user_permissions"]
  DeleteUser["RPC admin_delete_user"]
  AssignApp["RPC admin_assign_operaciones_access"]
  ListOps["RPC admin_list_operaciones_user_ids"]

  AdminUI --> Supabase
  Supabase --> ViewUsers
  Supabase --> Roles
  Supabase --> Areas
  Supabase --> Apps
  Supabase --> CreateRole
  Supabase --> UpdateRole
  Supabase --> UpdatePerms
  Supabase --> DeleteUser
  Supabase --> AssignApp
  Supabase --> ListOps
```

## 8. Agenda, Notificaciones y WhatsApp

```mermaid
flowchart TB
  AgendaUI["agenda-section / js/agenda.js / script.js agenda"]
  Assistant["js/agenda-assistant.js"]
  SB["Supabase Client"]
  Comites["agenda_comites"]
  Reuniones["agenda_reuniones"]
  Acuerdos["agenda_acuerdos"]
  Temas["agenda_temas"]
  Agenda2026["agenda_2026"]
  PushSubs["push_subscriptions"]
  WhatsApp["whatsapp_alertas"]
  SendAgenda["Edge Function send-agenda-notifications"]
  AlertCursos["Edge Function alertar-cursos"]
  Birthday["Edge Function send-birthday-emails"]
  RouteReminders["Edge Function send-route-launch-reminders"]

  AgendaUI --> SB
  Assistant --> SB
  SB --> Comites
  SB --> Reuniones
  SB --> Acuerdos
  SB --> Temas
  SB --> Agenda2026
  SB --> PushSubs
  SB --> WhatsApp
  SendAgenda --> Reuniones
  SendAgenda --> PushSubs
  AlertCursos --> Agenda2026
  AlertCursos --> WhatsApp
  Birthday --> Agenda2026
  RouteReminders --> WhatsApp
```

## 9. Manifiestos y Conciliacion

```mermaid
flowchart TB
  ManifestUI["Modulos manifiestos"]
  MFJS["js/manifiestos.js"]
  Pax["js/manifiestos_pax.js"]
  Cargo["js/manifiestos-carga.js"]
  Portal["js/portal-manifiestos.js"]
  UploadPax["js/manifiestos-upload.js"]
  UploadCargo["js/manifiestos-carga-upload.js"]
  Analysis["js/manifiestos-analisis.js"]
  Conci["Conciliacion en script.js / js/conci-manifiestos-table.js / js/conciliacion-board.js"]
  SB["Supabase Client"]
  MP["manifiestos_pasajeros"]
  PDFs["manifiestos_pdfs"]
  ConciTable["Conciliacion Manifiestos"]
  HistPax["Base de datos Manifiestos 2025 / Base de Datos Manifiestos Febrero 2026"]
  HistCargo["Base de Manifiestos Carga Febrero 2026"]
  Storage["Storage manifiestos_pdfs"]

  ManifestUI --> MFJS
  ManifestUI --> Pax
  ManifestUI --> Cargo
  ManifestUI --> Portal
  ManifestUI --> UploadPax
  ManifestUI --> UploadCargo
  ManifestUI --> Analysis
  Conci --> SB
  MFJS --> SB
  Pax --> SB
  Cargo --> SB
  Portal --> SB
  UploadPax --> SB
  UploadCargo --> SB
  Analysis --> SB
  SB --> MP
  SB --> PDFs
  SB --> ConciTable
  SB --> HistPax
  SB --> HistCargo
  SB --> Storage
```

## 10. Operaciones, Itinerario, Parte y FIDS

```mermaid
flowchart TB
  OpsUI["operaciones-totales-section"]
  Inicio["inicio-section"]
  Parte["parte-operaciones-section"]
  Fids["fids-section"]
  OpsJS["script.js / js/operaciones.js"]
  ItinerarioJS["js/itinerario.js / js/itinerario-tab.js"]
  ParteTab["js/parte-ops-tab.js"]
  ParteFlights["js/parte-ops-flights.js"]
  FidsJS["js/fids.js / js/fids-config.js"]
  Anual["js/analisis-anual.js"]
  Mensual["js/analisis-mensual.js"]
  YoyGeneral["js/yoy-general.js"]
  YoyCargo["js/yoy-cargo.js"]
  SB["Supabase Client"]
  Flights["flights"]
  ParteOps["parte_operations"]
  VuelosParte["vuelos_parte_operaciones"]
  VuelosCSV["vuelos_parte_operaciones_csv"]
  CustomParte["custom_parte_operaciones"]
  Daily["daily_operations"]
  Monthly["monthly_operations"]
  Annual["annual_operations"]

  OpsUI --> OpsJS
  Inicio --> ItinerarioJS
  Parte --> ParteTab
  Parte --> ParteFlights
  Fids --> FidsJS
  OpsJS --> SB
  ItinerarioJS --> SB
  ParteTab --> SB
  ParteFlights --> SB
  FidsJS --> SB
  Anual --> SB
  Mensual --> SB
  YoyGeneral --> SB
  YoyCargo --> SB
  SB --> Flights
  SB --> ParteOps
  SB --> VuelosParte
  SB --> VuelosCSV
  SB --> CustomParte
  SB --> Daily
  SB --> Monthly
  SB --> Annual
```

## 11. Biblioteca

```mermaid
flowchart TB
  BibliotecaSection["biblioteca-section en index.html"]
  PdfLightbox["AIFA.openPdfLightbox en js/core.js"]
  StaticPdfs["pdfs/"]
  Images["images/"]
  Browser["Navegador"]

  Browser --> BibliotecaSection
  BibliotecaSection --> PdfLightbox
  BibliotecaSection --> StaticPdfs
  BibliotecaSection --> Images
```

## 12. Asistentes IA Existentes

```mermaid
flowchart TB
  AgendaAssistant["js/agenda-assistant.js"]
  UI["Panel/asistente de agenda"]
  SB["Supabase Client"]
  ParteOps["parte_operations"]
  Flights["flights"]
  Airlines["airlines"]
  Airports["aeropuertos"]
  Aerolineas["Aerolíneas"]
  Annual["annual_operations"]

  UI --> AgendaAssistant
  AgendaAssistant --> SB
  SB --> ParteOps
  SB --> Flights
  SB --> Airlines
  SB --> Airports
  SB --> Aerolineas
  SB --> Annual
```

## 13. Realtime y Recarga de Modulos

```mermaid
flowchart TB
  RT["js/realtime.js"]
  Channel["Supabase channel rt-public-all"]
  PublicAll["postgres_changes public.*"]
  Watch["rtManager.watch(tablas, fn)"]
  Itinerary["loadItineraryData"]
  Ops["parteOpsReload / genYoyReload / cargoYoyReload / comHistReload"]
  Manifests["manifiestoReload / cargaReload"]
  Agenda["agBarRefresh"]
  Puntualidad["puntualidadRefresh"]
  Services["hvacReload / sseiDerramesReload / sseiEmergenciasReload / ingenieriaCivilReload"]

  RT --> Channel
  Channel --> PublicAll
  PublicAll --> Watch
  Watch --> Itinerary
  Watch --> Ops
  Watch --> Manifests
  Watch --> Agenda
  Watch --> Puntualidad
  Watch --> Services
```


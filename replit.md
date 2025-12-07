# EPG Manager - Panel de Administración IPTV

## Overview
Panel de administración para gestionar EPG (Electronic Program Guide) compatible con IPTV. Permite añadir canales personalizados con programas que se repiten en bucle cada hora, generando un archivo XML estático accesible vía URL.

## Features
- Dashboard con estadísticas de canales y estado del EPG
- Gestión de canales (CRUD): nombre, ID, logo, categoría
- Configuración de programa por canal (título y descripción)
- Generación automática de programación 24 horas (bucle de 1 hora)
- Exportación EPG en formato XMLTV compatible con IPTV
- URL estática para acceder al archivo XML generado
- Soporte para tema claro/oscuro

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Validation**: Zod

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn components
│   │   ├── app-sidebar.tsx
│   │   ├── channel-dialog.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── pages/
│   │   ├── dashboard.tsx
│   │   ├── channels.tsx
│   │   ├── export.tsx
│   │   └── not-found.tsx
│   ├── App.tsx
│   └── index.css
server/
├── routes.ts         # API endpoints
├── storage.ts        # In-memory storage
└── index.ts
shared/
└── schema.ts         # Data models (Channel, EpgConfig)
```

## API Endpoints
- `GET /api/channels` - Listar todos los canales
- `POST /api/channels` - Crear un nuevo canal
- `PATCH /api/channels/:id` - Actualizar un canal
- `DELETE /api/channels/:id` - Eliminar un canal
- `GET /api/epg/config` - Obtener configuración del EPG
- `POST /api/epg/generate` - Generar archivo EPG XML
- `GET /epg.xml` - Servir el archivo XML generado

## Running the App
```bash
npm run dev
```
Accede a la aplicación en `http://localhost:5000`

## EPG XML Format
El archivo generado sigue el estándar XMLTV con:
- Definición de canales (id, nombre, logo)
- Programas de 1 hora de duración
- Programación de 24 horas completa
- Compatible con la mayoría de reproductores IPTV

# Despliegue en Render.com

## Opcion 1: Usando Blueprint (render.yaml)

1. Sube tu codigo a GitHub o GitLab
2. Ve a [Render Dashboard](https://dashboard.render.com)
3. Click en **New +** > **Blueprint**
4. Conecta tu repositorio
5. Render detectara automaticamente el archivo `render.yaml`
6. Click en **Apply** para crear el servicio web y la base de datos

## Opcion 2: Configuracion Manual

### Paso 1: Crear Base de Datos PostgreSQL

1. En Render Dashboard, click **New +** > **PostgreSQL**
2. Configurar:
   - Name: `epg-manager-db`
   - Database: `epgmanager`
   - User: `epguser`
   - Region: Oregon (o la mas cercana)
   - Plan: Free
3. Click **Create Database**
4. Copia el **Internal Database URL** (lo necesitaras luego)

### Paso 2: Crear Web Service

1. Click **New +** > **Web Service**
2. Conecta tu repositorio de GitHub/GitLab
3. Configurar:
   - Name: `epg-manager`
   - Region: Misma que la base de datos
   - Branch: `main`
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free

4. En **Environment Variables**, agregar:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (pegar el Internal Database URL del paso anterior)

5. Click **Create Web Service**

## Despues del Despliegue

Una vez desplegado, ejecuta las migraciones de base de datos:

1. Ve a tu Web Service en Render
2. Click en la pestana **Shell**
3. Ejecuta: `npm run db:push`

Tu aplicacion estara disponible en: `https://epg-manager.onrender.com`

## Notas Importantes

- El plan gratuito de Render duerme el servicio despues de 15 minutos de inactividad
- La primera peticion despues de dormir toma ~30 segundos
- Para servicio siempre activo, considera un plan de pago
- La base de datos gratuita tiene limite de 90 dias

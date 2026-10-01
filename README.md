# CompraSmart — Comparador Eléctrico

Aplicación web profesional para evaluar y comparar productos eléctricos en tiendas según la ubicación, el presupuesto y el criterio de optimización seleccionado. La interfaz se comunica con flujos automatizados de n8n mediante endpoints en Next.js App Router.

## Requisitos

- Node.js (versión 20 o superior) y npm.
- URL activa del webhook de búsqueda de n8n (alojado en Railway u otro proveedor).
- URL activa del webhook de envío de resultados de n8n (notificaciones vía Telegram/Email).

## Instalación y ejecución

1. Clona el repositorio y entra en la carpeta del proyecto.
2. Instala las dependencias:

   ```bash
   npm ci
   ```

3. Crea el archivo local de variables de entorno a partir de la plantilla:

   En Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   En macOS o Linux:

   ```bash
   cp .env.example .env.local
   ```

4. Abre `.env.local` y configura las URLs de tus webhooks de Railway:
   - `N8N_WEBHOOK_URL`: endpoint para procesar búsquedas multicriterio.
   - `N8N_ENVIAR_URL`: endpoint para enviar reportes comparativos por Telegram o Email.

5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

6. Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `N8N_WEBHOOK_URL` | URL del webhook de n8n en Railway que recibe las consultas de búsqueda. |
| `N8N_ENVIAR_URL` | URL del webhook de n8n en Railway para el envío de resultados vía Telegram o Resend (Email). |

> **Nota para despliegue (Vercel, Railway, etc.):** Recuerda cargar ambas variables en el panel de configuración de variables de entorno de tu hosting. Las funciones API incluyen una configuración de `maxDuration` para admitir flujos de búsqueda de 1 a 2 minutos sin interrupción.

## Comandos disponibles

- `npm run dev`: inicia el servidor para desarrollo.
- `npm run build`: genera la versión de producción optimizada.
- `npm run start`: inicia la versión de producción (después de ejecutar el build).
- `npm run lint`: revisa el código con ESLint.

## Estructura principal

- `src/app/page.tsx`: interfaz principal con filtros, visualización de resultados y módulo de envío.
- `src/app/api/buscar/route.ts`: endpoint que reenvía las búsquedas al webhook de n8n con timeout extendido.
- `src/app/api/enviar/route.ts`: endpoint que procesa y reenvía reportes a Telegram/Email vía n8n.
- `src/types/index.ts`: tipos TypeScript alineados con el contrato de n8n.
- `contrato-n8n.json`: especificación y contrato de datos para la integración con n8n.
- `public/`: recursos estáticos.

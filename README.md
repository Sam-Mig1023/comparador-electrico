# CompraSmart — Comparador Eléctrico

Aplicación web para buscar y comparar productos en tiendas según la ubicación, el presupuesto y la prioridad elegida. La interfaz se comunica con un flujo de n8n mediante un endpoint del servidor Next.js.

## Requisitos

- Node.js y npm.
- Una URL activa del webhook de n8n configurado para procesar búsquedas.

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

4. Abre `.env.local` y reemplaza el valor de `N8N_WEBHOOK_URL` por la URL de tu webhook de n8n. No publiques ese archivo si contiene credenciales o datos privados.
5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

6. Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `N8N_WEBHOOK_URL` | URL del webhook de n8n que recibe las solicitudes de búsqueda. |

La plantilla está en `.env.example`. El archivo `.env.local` es local y está excluido de Git.

## Comandos disponibles

- `npm run dev`: inicia el servidor para desarrollo.
- `npm run build`: genera la versión de producción.
- `npm run start`: inicia la versión de producción (después de ejecutar el build).
- `npm run lint`: revisa el código con ESLint.

## Estructura principal

- `src/app/`: interfaz y rutas de la aplicación.
- `src/app/api/buscar/route.ts`: endpoint que reenvía las búsquedas al webhook de n8n.
- `src/types/`: tipos usados por la aplicación.
- `public/`: recursos estáticos.
- `contrato-n8n.json`: contrato de datos para la integración con n8n.

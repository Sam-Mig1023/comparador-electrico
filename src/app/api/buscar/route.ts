import { NextResponse } from "next/server";
import { BusquedaRequest, BusquedaResponse } from "../../../types";

// Límite de duración para funciones serverless en plataformas de hosting (Vercel, Railway, etc.)
// Necesario porque el flujo de web scraping y evaluación en n8n puede tardar 1-2 minutos.
export const maxDuration = 150;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: BusquedaRequest = await request.json();

    if (!body.consulta || body.consulta.trim() === "") {
      return NextResponse.json(
        { error: "El campo 'consulta' es obligatorio para procesar la búsqueda." },
        { status: 400 }
      );
    }

    // =========================================================================
    // CONEXIÓN CON EL WEBHOOK DE n8n EN RAILWAY
    // =========================================================================
    const N8N_WEBHOOK_URL =
      process.env.N8N_WEBHOOK_URL || "https://n8n-production-xxxx.up.railway.app/webhook/comparador";

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Timeout extendido a 150 segundos (2.5 minutos) para permitir procesamiento exhaustivo
      signal: AbortSignal.timeout(150000),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text().catch(() => "");
      console.error(`Error en webhook n8n (${n8nResponse.status}):`, errorText);
      throw new Error(`Error en webhook n8n: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nData: BusquedaResponse = await n8nResponse.json();
    return NextResponse.json(n8nData);
  } catch (error: unknown) {
    console.error("Error en endpoint /api/buscar:", error);

    const err = error as { name?: string; message?: string };
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "El servidor de n8n tardó más de 2 minutos en responder. Es posible que las tiendas consultadas estén experimentando alta latencia. Por favor, reintente en unos instantes.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Hubo un problema al conectar con el servidor de análisis en n8n. Por favor, verifique la conexión e inténtelo de nuevo.",
      },
      { status: 500 }
    );
  }
}

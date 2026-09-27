import { NextResponse } from "next/server";
import { BusquedaRequest, BusquedaResponse } from "../../../types";

export async function POST(request: Request) {
  try {
    const body: BusquedaRequest = await request.json();

    if (!body.consulta || body.consulta.trim() === "") {
      return NextResponse.json(
        { error: "El campo 'consulta' es obligatorio para procesar la búsqueda en CompraSmart." },
        { status: 400 }
      );
    }

    // =========================================================================
    // CONEXIÓN CON EL WEBHOOK DE n8n
    // =========================================================================
    const N8N_WEBHOOK_URL =
      process.env.N8N_WEBHOOK_URL || "https://tu-instancia-n8n.com/webhook/comparador";

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!n8nResponse.ok) {
      throw new Error(`Error en webhook n8n: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nData: BusquedaResponse = await n8nResponse.json();
    return NextResponse.json(n8nData);
  } catch (error) {
    console.error("Error en endpoint /api/buscar:", error);
    return NextResponse.json(
      { error: "Hubo un problema al conectar con el servidor de análisis. Por favor, inténtelo de nuevo." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { EnviarResultadosRequest } from "../../../types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: EnviarResultadosRequest = await request.json();

    // 1. Validación estricta de canal (Requisito 20)
    if (!body.canal || (body.canal !== "telegram" && body.canal !== "email")) {
      return NextResponse.json(
        {
          error:
            "Canal inválido. Los canales de notificación admitidos son exclusivamente 'telegram' o 'email'.",
        },
        { status: 400 }
      );
    }

    // 2. Validación de destino
    if (!body.destino || body.destino.trim() === "") {
      return NextResponse.json(
        {
          error:
            body.canal === "telegram"
              ? "Debe indicar el Chat ID numérico de Telegram."
              : "Debe indicar una dirección de correo electrónico válida.",
        },
        { status: 400 }
      );
    }

    const destinoLimpio = body.destino.trim();

    // Validación específica para Telegram (Requisito 18: Chat ID numérico)
    if (body.canal === "telegram") {
      if (destinoLimpio.startsWith("@") || isNaN(Number(destinoLimpio))) {
        return NextResponse.json(
          {
            error:
              "Destino de Telegram inválido. Debe ingresar su Chat ID numérico (ej. 123456789), no el @nombre_de_usuario. Recuerde haber iniciado conversación al menos una vez con el bot.",
          },
          { status: 400 }
        );
      }
    }

    // Validación básica para Email (Requisito 19: Resend)
    if (body.canal === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(destinoLimpio)) {
        return NextResponse.json(
          {
            error: "La dirección de correo electrónico proporcionada no tiene un formato válido.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Validación de productos a enviar (Requisito 17)
    if (!body.productos || !Array.isArray(body.productos) || body.productos.length === 0) {
      return NextResponse.json(
        { error: "No se incluyeron productos para generar el reporte de envío." },
        { status: 400 }
      );
    }

    // =========================================================================
    // CONEXIÓN CON EL WEBHOOK DE ENVÍO EN n8n (RAILWAY)
    // =========================================================================
    const N8N_ENVIAR_URL =
      process.env.N8N_ENVIAR_URL ||
      "https://n8n-production-xxxx.up.railway.app/webhook/enviar-resultado";

    const payloadEnvio = {
      canal: body.canal,
      destino: destinoLimpio,
      consulta: body.consulta || "",
      productos: body.productos.map((prod) => ({
        nombre: prod.nombre,
        precio: prod.precio,
        tienda: prod.tienda,
        url: prod.url || "",
      })),
      recomendacion: body.recomendacion || null,
      fecha_solicitud: new Date().toISOString(),
    };

    const n8nResponse = await fetch(N8N_ENVIAR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadEnvio),
      signal: AbortSignal.timeout(60000), // Timeout de 60 segundos
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text().catch(() => "");
      console.error(`Error en webhook n8n enviar (${n8nResponse.status}):`, errorText);
      return NextResponse.json(
        {
          error: `El servicio de mensajería n8n respondió con error (${n8nResponse.status}). Verifique la configuración del webhook.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        body.canal === "telegram"
          ? "Reporte comparativo enviado exitosamente a tu chat de Telegram."
          : "Reporte comparativo enviado exitosamente a tu correo electrónico.",
    });
  } catch (error: unknown) {
    console.error("Error en endpoint /api/enviar:", error);

    const err = error as { name?: string; message?: string };
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "El servicio de envío tardó demasiado tiempo en responder. Por favor, reintente en unos instantes.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Hubo un problema al procesar el envío de resultados. Por favor, inténtelo de nuevo más tarde.",
      },
      { status: 500 }
    );
  }
}

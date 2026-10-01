"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BusquedaRequest,
  BusquedaResponse,
  ResultadoTienda,
  UbicacionDetalle,
  TipoPrioridad,
  CanalEnvio,
  EnviarResultadosRequest,
  EnviarResultadosResponse,
} from "../types";

// Ubicaciones comunes preconfiguradas para cálculo logístico regional
const UBICACIONES_DISPONIBLES: UbicacionDetalle[] = [
  { ciudad: "Trujillo", departamento: "La Libertad" },
  { ciudad: "Lima", departamento: "Lima Metropolitana" },
  { ciudad: "Arequipa", departamento: "Arequipa" },
  { ciudad: "Chiclayo", departamento: "Lambayeque" },
  { ciudad: "Piura", departamento: "Piura" },
  { ciudad: "Cusco", departamento: "Cusco" },
];

// Presupuestos rápidos sugeridos
const PRESUPUESTOS_RAPIDOS = [200, 240, 280, 350];

interface BusquedaReciente {
  consulta: string;
  ciudad: string;
  departamento: string;
  prioridad: TipoPrioridad;
  fecha: string;
}

// Datos de demostración representativos basados en contrato-n8n.json
const DATOS_DEMOSTRACION: BusquedaResponse = {
  producto_buscado: "teclado mecánico inalámbrico",
  categoria: "Periféricos y Computación",
  tipo: "Hardware",
  desde_cache: false,
  riesgo_detectado: false,
  resultados: [
    {
      tienda: "Tienda D",
      producto: "Modelo X Pro Inalámbrico Switch Brown",
      link: "https://tiendad.com/producto/modelo-x-pro",
      precio: 225,
      envio: 15,
      empresa_transporte: "Olva Courier",
      costo_total: 240,
      tiempo_entrega_dias: 2,
      garantia: "2 años oficial",
      reputacion: 4.7,
      confiabilidad_score: 0.91,
    },
    {
      tienda: "Tienda A",
      producto: "Modelo X Estándar Wireless RGB",
      link: "https://tiendaa.com/producto/modelo-x",
      precio: 250,
      envio: 0,
      empresa_transporte: "Envío Propio Express",
      costo_total: 250,
      tiempo_entrega_dias: 2,
      garantia: "1 año distribuidor",
      reputacion: "4.8 / 5",
      confiabilidad_score: 0.88,
    },
    {
      tienda: "Tienda B",
      producto: "Modelo X Gamer RGB Bluetooth",
      link: "https://tiendab.com/producto/modelo-x-gamer",
      precio: 210,
      envio: 25,
      empresa_transporte: "Shalom",
      costo_total: 235,
      tiempo_entrega_dias: 4,
      garantia: null,
      reputacion: 4.5,
      confiabilidad_score: 0.82,
    },
    {
      tienda: "Tienda C",
      producto: "Modelo X Outlet Reacondicionado",
      link: "https://tiendac.com/producto/modelo-x-outlet",
      precio: 190,
      envio: 40,
      empresa_transporte: null,
      costo_total: 230,
      tiempo_entrega_dias: 5,
      garantia: "6 meses local",
      reputacion: null,
      confiabilidad_score: 0.65,
    },
  ],
  recomendacion: {
    tienda: "Tienda D",
    motivo:
      "Aunque no presenta el valor nominal más bajo, ofrece la mejor relación costo-beneficio considerando flete formal, garantía de 2 años y reputación verificada en Trujillo.",
  },
};

export default function Home() {
  // Parámetros de consulta
  const [consulta, setConsulta] = useState("");
  const [ubicacion, setUbicacion] = useState<UbicacionDetalle>({
    ciudad: "Trujillo",
    departamento: "La Libertad",
  });
  const [presupuestoMaximo, setPresupuestoMaximo] = useState<string>("");
  const [prioridad, setPrioridad] = useState<TipoPrioridad>("balanceado");

  // Modo de visualización (Tarjetas vs Tabla Matricial)
  const [modoVista, setModoVista] = useState<"tarjetas" | "tabla">("tarjetas");

  // Estado de carga y progreso dinámico
  const [cargando, setCargando] = useState(false);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);

  // Estados de datos y respuestas
  const [datos, setDatos] = useState<BusquedaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastNotificacion, setToastNotificacion] = useState<string | null>(null);

  // Modal interactivo de detalle de tienda
  const [tiendaSeleccionadaModal, setTiendaSeleccionadaModal] = useState<ResultadoTienda | null>(null);

  // Historial en localStorage
  // Historial en localStorage
  const [busquedasRecientes, setBusquedasRecientes] = useState<BusquedaReciente[]>([]);
  const [historialHidratado, setHistorialHidratado] = useState(false);

  // Estados para el módulo de envío de resultados (Telegram / Email)
  const [canalEnvio, setCanalEnvio] = useState<CanalEnvio>("telegram");
  const [destinoEnvio, setDestinoEnvio] = useState("");
  const [enviandoResultados, setEnviandoResultados] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Ordenamiento manual opcional de columnas en tabla
  const [columnaOrden, setColumnaOrden] = useState<keyof ResultadoTienda | null>(null);
  const [direccionOrden, setDireccionOrden] = useState<"asc" | "desc">("asc");

  // Temporizador dinámico para mensajes de espera progresivos
  useEffect(() => {
    if (!cargando) return;
    const intervalo = setInterval(() => {
      setSegundosTranscurridos((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(intervalo);
  }, [cargando]);
  // Cargar el historial después del primer render para evitar errores de hidratación
  useEffect(() => {
    try {
      const guardadas = localStorage.getItem("comprasmart_busquedas_recientes");

      if (guardadas) {
        setBusquedasRecientes(JSON.parse(guardadas));
      }
    } catch {
      // Ignorar datos ilegibles o fallas de lectura
    } finally {
      setHistorialHidratado(true);
    }
  }, []);

  // Mensaje progresivo según el tiempo transcurrido
  const mensajeCargaActual = useMemo(() => {
    if (segundosTranscurridos < 3) {
      return "Analizando parámetros de búsqueda y filtros solicitados...";
    }
    if (segundosTranscurridos < 8) {
      return `Consultando disponibilidad en tiendas para ${ubicacion.ciudad}...`;
    }
    if (segundosTranscurridos < 16) {
      return "Extrayendo cotizaciones, costos de flete estimados y plazos de entrega...";
    }
    if (segundosTranscurridos < 28) {
      return "Evaluando garantías oficiales y reputación verificada de vendedores...";
    }
    if (segundosTranscurridos < 45) {
      return "Ejecutando ponderación multicriterio y mitigando proveedores de riesgo...";
    }
    if (segundosTranscurridos < 75) {
      return "El flujo de n8n está procesando la solicitud. Esto puede tardar hasta 2 minutos...";
    }
    if (segundosTranscurridos < 105) {
      return "Búsqueda exhaustiva en curso en fuentes externas. Gracias por tu espera...";
    }
    return "Consolidando reporte comparativo final de tiendas...";
  }, [segundosTranscurridos, ubicacion.ciudad]);

  // Toast flotante
  const mostrarToast = useCallback((mensaje: string) => {
    setToastNotificacion(mensaje);
    setTimeout(() => {
      setToastNotificacion(null);
    }, 4000);
  }, []);

  // Guardar búsqueda en el historial local
  const guardarEnHistorial = useCallback(
    (termino: string, ubi: UbicacionDetalle, prio: TipoPrioridad) => {
      try {
        const nuevaEntrada: BusquedaReciente = {
          consulta: termino,
          ciudad: ubi.ciudad,
          departamento: ubi.departamento,
          prioridad: prio,
          fecha: new Date().toLocaleDateString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        const filtradas = busquedasRecientes.filter(
          (b) => b.consulta.toLowerCase() !== termino.toLowerCase()
        );
        const actualizadas = [nuevaEntrada, ...filtradas].slice(0, 5);
        setBusquedasRecientes(actualizadas);
        localStorage.setItem(
          "comprasmart_busquedas_recientes",
          JSON.stringify(actualizadas)
        );
      } catch {
        // Ignorar fallas de escritura
      }
    },
    [busquedasRecientes]
  );

  // Ejecución de la búsqueda real hacia /api/buscar
  const ejecutarBusqueda = async (
    terminoManual?: string,
    ubicacionManual?: UbicacionDetalle,
    prioridadManual?: TipoPrioridad,
    presupuestoManual?: string
  ) => {
    const textoFinal = (terminoManual ?? consulta).trim();
    const ubicacionFinal = ubicacionManual ?? ubicacion;
    const prioridadFinal = prioridadManual ?? prioridad;
    const presupuestoTexto = presupuestoManual ?? presupuestoMaximo;

    if (!textoFinal) {
      setError("Por favor, ingresa el producto o consulta técnica que deseas evaluar.");
      return;
    }

    setError(null);
    setCargando(true);
    setSegundosTranscurridos(0);
    setDatos(null);
    setColumnaOrden(null);
    setMensajeEnvio(null);

    const payload: BusquedaRequest = {
      consulta: textoFinal,
      ubicacion: {
        ciudad: ubicacionFinal.ciudad,
        departamento: ubicacionFinal.departamento,
      },
      presupuesto_maximo: presupuestoTexto ? Number(presupuestoTexto) : null,
      usuario_id: "usr-comprasmart-01",
      prioridad: prioridadFinal,
    };

    try {
      const respuesta = await fetch("/api/buscar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => null);
        throw new Error(
          errorData?.error ||
            "Hubo un problema al conectar con el motor de análisis en n8n."
        );
      }

      const respuestaData: BusquedaResponse = await respuesta.json();
      setDatos(respuestaData);
      guardarEnHistorial(textoFinal, ubicacionFinal, prioridadFinal);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : "Error inesperado de conexión.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  // Cargar caso de demostración interactivo
  const cargarCasoDemostracion = () => {
    setConsulta(DATOS_DEMOSTRACION.producto_buscado);
    setPresupuestoMaximo("245");
    setPrioridad("balanceado");
    setError(null);
    setCargando(false);
    setDatos(DATOS_DEMOSTRACION);
    mostrarToast("✓ Caso de prueba representativo cargado para sustentación.");
  };

  // Alternar simulaciones de banderas en vivo
  const alternarRiesgoSimulado = () => {
    if (!datos) return;
    setDatos((prev) => (prev ? { ...prev, riesgo_detectado: !prev.riesgo_detectado } : null));
    mostrarToast(
      !datos.riesgo_detectado
        ? "⚠️ Alerta de riesgo simulada activada."
        : "Alerta de riesgo desactivada."
    );
  };

  const alternarCacheSimulado = () => {
    if (!datos) return;
    setDatos((prev) => (prev ? { ...prev, desde_cache: !prev.desde_cache } : null));
    mostrarToast(
      !datos.desde_cache
        ? "⚡ Indicador de datos en caché activado."
        : "Indicador de caché desactivado."
    );
  };

  // Disparar búsqueda al cambiar de prioridad
  const cambiarPrioridadYBuscar = (nuevaPrioridad: TipoPrioridad) => {
    setPrioridad(nuevaPrioridad);
    if (consulta.trim()) {
      ejecutarBusqueda(consulta, ubicacion, nuevaPrioridad, presupuestoMaximo);
    }
  };

  const manejarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda();
  };

  // Seleccionar desde el historial
  const seleccionarDesdeHistorial = (item: BusquedaReciente) => {
    setConsulta(item.consulta);
    const ubiEncontrada =
      UBICACIONES_DISPONIBLES.find((u) => u.ciudad === item.ciudad) || {
        ciudad: item.ciudad,
        departamento: item.departamento || "La Libertad",
      };
    setUbicacion(ubiEncontrada);
    setPrioridad(item.prioridad || "balanceado");
    setError(null);
    ejecutarBusqueda(item.consulta, ubiEncontrada, item.prioridad);
  };

  // Ordenar columnas en la tabla
  const alternarColumna = (columna: keyof ResultadoTienda) => {
    if (columnaOrden === columna) {
      setDireccionOrden((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setColumnaOrden(columna);
      setDireccionOrden("asc");
    }
  };

  // Presupuesto numérico
  const presNum = useMemo(() => {
    if (!presupuestoMaximo) return null;
    const n = Number(presupuestoMaximo);
    return isNaN(n) || n <= 0 ? null : n;
  }, [presupuestoMaximo]);

  // Lista de resultados mostrados
  const resultadosMostrados = useMemo(() => {
    if (!datos?.resultados) return [];
    if (!columnaOrden) return datos.resultados;

    return [...datos.resultados].sort((a, b) => {
      const valA = a[columnaOrden];
      const valB = b[columnaOrden];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return direccionOrden === "asc" ? valA - valB : valB - valA;
      }
      return direccionOrden === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [datos, columnaOrden, direccionOrden]);

  // Métricas agregadas para el Dashboard Ejecutivo
  const metricasKPI = useMemo(() => {
    if (!datos?.resultados || datos.resultados.length === 0) return null;

    const lista = datos.resultados;
    const preciosTotales = lista.map((r) => r.costo_total);
    const minTotal = Math.min(...preciosTotales);
    const maxTotal = Math.max(...preciosTotales);
    const ahorroPotencial = maxTotal - minTotal;

    const diasEntrega = lista.map((r) => r.tiempo_entrega_dias);
    const entregaMinima = Math.min(...diasEntrega);

    const scores = lista.map((r) => r.confiabilidad_score);
    const scoreMaximo = Math.max(...scores);

    return {
      minTotal,
      maxTotal,
      ahorroPotencial,
      entregaMinima,
      scoreMaximo,
      totalOpciones: lista.length,
    };
  }, [datos]);

  // Detección de si ningún producto está dentro del presupuesto
  const ningunProductoEnPresupuesto = Boolean(
    presNum !== null &&
    datos?.resultados &&
    datos.resultados.length > 0 &&
    datos.resultados.every((item) => item.costo_total > presNum)
  );

  // Tienda recomendada resuelta por nombre
  const tiendaRecomendadaItem = useMemo(() => {
    if (!datos?.recomendacion?.tienda || !datos.resultados || datos.resultados.length === 0) {
      return null;
    }
    const nombreBuscado = datos.recomendacion.tienda.trim().toLowerCase();
    const encontrada = datos.resultados.find(
      (r) => r.tienda.trim().toLowerCase() === nombreBuscado
    );
    return encontrada || datos.resultados[0];
  }, [datos]);

  // Simulación de redirección / compra
  const manejarAccionComprar = (tienda: string, producto: string, costoTotal: number, link?: string) => {
    mostrarToast(
      `Redirección simulada a ${tienda} (${producto}) por S/ ${costoTotal.toFixed(2)}.`
    );
    if (link && link.trim() && link.startsWith("http")) {
      setTimeout(() => {
        window.open(link, "_blank", "noopener,noreferrer");
      }, 1200);
    }
  };

  // Enviar resultados vía /api/enviar
  const manejarEnviarResultados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datos || !datos.resultados || datos.resultados.length === 0) return;

    const destinoLimpio = destinoEnvio.trim();
    if (!destinoLimpio) {
      setMensajeEnvio({
        tipo: "error",
        texto:
          canalEnvio === "telegram"
            ? "Por favor, ingresa tu Chat ID numérico de Telegram."
            : "Por favor, ingresa una dirección de correo válida.",
      });
      return;
    }

    if (canalEnvio === "telegram") {
      if (destinoLimpio.startsWith("@") || isNaN(Number(destinoLimpio))) {
        setMensajeEnvio({
          tipo: "error",
          texto:
            "El destino para Telegram debe ser tu Chat ID numérico (ej. 123456789), no el @usuario. Recuerda escribirle al bot una vez antes de enviar.",
        });
        return;
      }
    }

    setEnviandoResultados(true);
    setMensajeEnvio(null);

    const payload: EnviarResultadosRequest = {
      canal: canalEnvio,
      destino: destinoLimpio,
      consulta: datos.producto_buscado,
      productos: datos.resultados.map((item) => ({
        nombre: item.producto,
        precio: item.precio,
        tienda: item.tienda,
        url: item.link || "",
      })),
      recomendacion: datos.recomendacion,
    };

    try {
      const res = await fetch("/api/enviar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resJson: EnviarResultadosResponse = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resJson.error || "No se pudo completar el envío del reporte.");
      }

      setMensajeEnvio({
        tipo: "exito",
        texto: resJson.mensaje || "Resultados enviados exitosamente.",
      });
      mostrarToast(
        canalEnvio === "telegram"
          ? "✓ Reporte enviado a tu Telegram."
          : "✓ Reporte enviado a tu correo electrónico."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar el envío de resultados.";
      setMensajeEnvio({
        tipo: "error",
        texto: msg,
      });
    } finally {
      setEnviandoResultados(false);
    }
  };

  // Copiar resumen de comparación al portapapeles
  const copiarResumenPortapapeles = () => {
    if (!datos) return;
    const lineas = [
      `📊 Comparativa CompraSmart: ${datos.producto_buscado}`,
      `📍 Ubicación: ${ubicacion.ciudad}, ${ubicacion.departamento}`,
      `⭐ Recomendación: ${datos.recomendacion?.tienda || "N/A"}`,
      `💬 Motivo: ${datos.recomendacion?.motivo || ""}`,
      "",
      "Proveedores evaluados:",
      ...datos.resultados.map(
        (r, i) =>
          `${i + 1}. ${r.tienda} | Costo Total: S/ ${r.costo_total.toFixed(2)} (Envío: S/ ${r.envio.toFixed(2)}) | Entrega: ${r.tiempo_entrega_dias}d`
      ),
    ].join("\n");

    navigator.clipboard.writeText(lineas).then(() => {
      mostrarToast("✓ Resumen comparativo copiado al portapapeles.");
    });
  };

  // Renderizador de badges de Confiabilidad en tonos pastel
  const renderBadgeConfiabilidad = (score: number) => {
    const porcentaje = Math.round(score * 100);

    if (score < 0.75) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Riesgo ({porcentaje}%)
        </span>
      );
    }
    if (score >= 0.85) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Alta ({porcentaje}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Media ({porcentaje}%)
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8faff] text-slate-900 flex flex-col antialiased relative overflow-hidden">
      
      {/* ========================================================================= */}
      {/* GRÁFICOS DIFUMINADOS DE FONDO (AURORA MESH & GLOW ORBS) */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none z-0" />
      <div className="fixed -top-40 -left-40 w-[34rem] h-[34rem] bg-indigo-200/35 rounded-full blur-[128px] pointer-events-none z-0" />
      <div className="fixed top-20 -right-20 w-[38rem] h-[38rem] bg-sky-200/40 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-[45%] left-1/3 w-[30rem] h-[30rem] bg-purple-200/25 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-32 right-1/4 w-[36rem] h-[36rem] bg-rose-100/35 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Toast Flotante */}
      {toastNotificacion && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 bg-slate-900/90 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
            ✓
          </div>
          <p className="text-xs font-medium text-slate-100">{toastNotificacion}</p>
        </div>
      )}

      {/* Barra de Navegación Superior Premium Glassmorphism */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-xs">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-4 ring-indigo-500/10 transition-transform hover:scale-105">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 bg-clip-text text-transparent flex items-center gap-2">
                CompraSmart
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                Comparador de productos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón de Demostración Rápida con Gradiente Pastel Suave */}
            <button
              type="button"
              onClick={cargarCasoDemostracion}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 border border-indigo-200/70 transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-sm active:scale-95"
              title="Cargar inmediatamente un caso representativo preconfigurado"
            >
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Cargar Demo</span>
            </button>

            {/* Badge de conexión con n8n en Railway */}
            <div className="hidden md:flex items-center gap-2 text-xs bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/80 text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
              <span className="font-semibold text-slate-800">Motor n8n</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                Conectado
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-8 w-full space-y-8 flex-1 relative z-10">
        
        {/* Cabecera Hero con Enfoque de Marca Corporativa */}
        <section className="text-center max-w-4xl mx-auto space-y-3 pt-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Compara productos y ofertas con{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              criterios claros
            </span>
          </h1>

          <p className="text-slate-600 text-base leading-relaxed max-w-2xl mx-auto">
            Revisa precio, envío, entrega y confiabilidad en un solo lugar.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* PANEL DE CONTROL: FILTROS Y BÚSQUEDA */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 2xl:grid-cols-4 gap-6">
          
          {/* Barra Lateral de Configuración de Filtros (Glassmorphism Frosted) */}
          <aside className="2xl:col-span-1 space-y-5">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5 ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  Filtros
                </h2>
              </div>

              {/* Selector de Ciudad de Entrega */}
              <div className="space-y-1.5">
                <label htmlFor="ubicacion" className="block text-xs font-bold text-slate-700">
                  Destino logístico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <select
                    id="ubicacion"
                    value={ubicacion.ciudad}
                    onChange={(e) => {
                      const seleccionada = UBICACIONES_DISPONIBLES.find(
                        (u) => u.ciudad === e.target.value
                      );
                      if (seleccionada) {
                        setUbicacion(seleccionada);
                        if (consulta.trim()) {
                          ejecutarBusqueda(consulta, seleccionada, prioridad, presupuestoMaximo);
                        }
                      }
                    }}
                    disabled={cargando}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition appearance-none cursor-pointer"
                  >
                    {UBICACIONES_DISPONIBLES.map((u) => (
                      <option key={u.ciudad} value={u.ciudad}>
                        {u.ciudad} ({u.departamento})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Ajusta fletes y plazos de despacho a esta plaza</p>
              </div>

              {/* Presupuesto Máximo con Presets Rápidos */}
              <div className="space-y-2 pt-1">
                <label htmlFor="presupuesto" className="block text-xs font-bold text-slate-700">
                  Presupuesto máximo (S/) <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="space-y-3">
                  <div>
                    <input
                      id="presupuesto-rango"
                      type="range"
                      min="0"
                      max={Math.max(1500, Math.ceil((Number(presupuestoMaximo) || 0) / 10) * 10)}
                      step="10"
                      value={presupuestoMaximo ? Number(presupuestoMaximo) : 0}
                      onChange={(e) => setPresupuestoMaximo(e.target.value === "0" ? "" : e.target.value)}
                      disabled={cargando}
                      aria-label="Ajustar presupuesto máximo con el deslizador"
                      aria-valuetext={presupuestoMaximo ? `S/ ${presupuestoMaximo}` : "Sin límite"}
                      className="w-full accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Sin límite</span>
                      <span>S/ {Math.max(1500, Math.ceil((Number(presupuestoMaximo) || 0) / 10) * 10)}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      id="presupuesto"
                      type="number"
                      min="0"
                      step="1"
                      value={presupuestoMaximo}
                      onChange={(e) => setPresupuestoMaximo(e.target.value)}
                      placeholder="Sin límite"
                      disabled={cargando}
                      className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Pills de Presupuestos Rápidos */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {PRESUPUESTOS_RAPIDOS.map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      onClick={() => setPresupuestoMaximo(String(monto))}
                      disabled={cargando}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                        presupuestoMaximo === String(monto)
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      S/ {monto}
                    </button>
                  ))}
                  {presupuestoMaximo && (
                    <button
                      type="button"
                      onClick={() => setPresupuestoMaximo("")}
                      className="text-xs px-2 py-0.5 text-slate-400 hover:text-rose-600 transition cursor-pointer font-semibold"
                    >
                      Sin límite
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de Criterio de Prioridad */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Criterio de Ponderación
                </label>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("balanceado")}
                    disabled={cargando}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                      prioridad === "balanceado"
                        ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-900 border border-indigo-300/80 shadow-xs"
                        : "bg-slate-50/70 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <span>Balanceado (Multicriterio)</span>
                    </div>
                    {prioridad === "balanceado" && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-100/80 font-bold text-indigo-700">
                        Activo
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("costo")}
                    disabled={cargando}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                      prioridad === "costo"
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border border-emerald-300/80 shadow-xs"
                        : "bg-slate-50/70 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span>Menor Costo Total</span>
                    </div>
                    {prioridad === "costo" && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100/80 font-bold text-emerald-700">
                        Activo
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("envio")}
                    disabled={cargando}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                      prioridad === "envio"
                        ? "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-900 border border-sky-300/80 shadow-xs"
                        : "bg-slate-50/70 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                      <span>Menor Tiempo de Entrega</span>
                    </div>
                    {prioridad === "envio" && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-sky-100/80 font-bold text-sky-700">
                        Activo
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("reputacion")}
                    disabled={cargando}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                      prioridad === "reputacion"
                        ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border border-amber-300/80 shadow-xs"
                        : "bg-slate-50/70 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Mayor Reputación</span>
                    </div>
                    {prioridad === "reputacion" && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100/80 font-bold text-amber-700">
                        Activo
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Botones de prueba para simular banderas de sustentación */}
              {datos && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Modos de Sustentación
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={alternarRiesgoSimulado}
                      className={`text-xs py-1.5 px-2 rounded-xl font-bold border transition cursor-pointer ${
                        datos.riesgo_detectado
                          ? "bg-rose-100 text-rose-800 border-rose-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {datos.riesgo_detectado ? "⚠️ Riesgo ON" : "Probar Riesgo"}
                    </button>
                    <button
                      type="button"
                      onClick={alternarCacheSimulado}
                      className={`text-xs py-1.5 px-2 rounded-xl font-bold border transition cursor-pointer ${
                        datos.desde_cache
                          ? "bg-indigo-100 text-indigo-800 border-indigo-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {datos.desde_cache ? "⚡ Caché ON" : "Probar Caché"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Búsquedas Recientes */}
            {historialHidratado && busquedasRecientes.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Historial
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      setBusquedasRecientes([]);
                      try {
                        localStorage.removeItem("comprasmart_busquedas_recientes");
                      } catch {}
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 transition cursor-pointer font-medium"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="space-y-1">
                  {busquedasRecientes.map((reciente, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => seleccionarDesdeHistorial(reciente)}
                      className="w-full text-left p-2.5 rounded-2xl text-xs hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition group flex items-center justify-between cursor-pointer"
                      title="Haz clic para volver a evaluar esta consulta"
                    >
                      <span className="truncate font-semibold text-slate-700 group-hover:text-indigo-700">
                        {reciente.consulta}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {reciente.ciudad}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Área Principal: Input de Búsqueda, Loader, y Vistas */}
          <div className="2xl:col-span-3 space-y-6 min-w-0">
            
            {/* Input de Búsqueda Estilo Command Center con Gradiente y Sombras Suaves */}
            <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.05)] ring-1 ring-slate-900/5 space-y-4">
              <form onSubmit={manejarSubmit} className="space-y-3">
                <div className="relative">
                  <div className="absolute top-3.5 left-4 pointer-events-none text-indigo-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <textarea
                    rows={1}
                    value={consulta}
                    onChange={(e) => setConsulta(e.target.value)}
                    placeholder="¿Qué producto deseas comparar? Ej. teclado mecánico inalámbrico"
                    disabled={cargando}
                    className="w-full min-h-14 pl-12 pr-28 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-500/25 focus:border-indigo-500 transition resize-none font-medium leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ejecutarBusqueda();
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    <button
                      type="submit"
                      disabled={cargando || !consulta.trim()}
                      aria-label={cargando ? "Buscando productos" : "Buscar productos"}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {cargando ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Evaluando...</span>
                        </>
                      ) : (
                        <>
                          <span>Buscar</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sugerencias Rápidas con Estilo Pastel */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                  <span className="font-bold text-slate-700">Casos rápidos:</span>
                  {[
                    "teclado mecánico inalámbrico",
                    "taladro percutor inalámbrico 20V",
                    "multímetro digital profesional",
                  ].map((ejemplo) => (
                    <button
                      key={ejemplo}
                      type="button"
                      onClick={() => {
                        setConsulta(ejemplo);
                        ejecutarBusqueda(ejemplo);
                      }}
                      disabled={cargando}
                      className="px-3 py-1 rounded-xl bg-slate-100/80 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/80 text-slate-600 transition-all font-medium cursor-pointer"
                    >
                      {ejemplo}
                    </button>
                  ))}
                </div>
              </form>

              {/* Banner de Error */}
              {error && (
                <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3 shadow-2xs animate-in fade-in">
                  <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="space-y-1">
                    <p className="font-bold text-rose-900">Aviso del Sistema</p>
                    <p>{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => ejecutarBusqueda()}
                    className="ml-auto px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition shadow-xs"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* LOADER PROGRESIVO CON TIEMPO REAL */}
            {/* ========================================================================= */}
            {cargando && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-8 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.05)] ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-50 via-purple-50 to-sky-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 animate-spin shadow-inner">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-base font-bold text-slate-900">
                      {mensajeCargaActual}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Tiempo transcurrido: <span className="font-bold text-indigo-700">{segundosTranscurridos}s</span> (la evaluación y cálculo de fletes puede tardar hasta 2 minutos).
                    </p>
                  </div>
                  <div className="w-80 bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner p-0.5">
                    <div
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 h-full rounded-full transition-all duration-500 ease-out shadow-xs"
                      style={{
                        width: `${Math.min(95, Math.max(10, Math.round((segundosTranscurridos / 120) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Skeletons de Carga */}
                <div className="space-y-4 animate-pulse">
                  <div className="bg-white/70 rounded-3xl p-6 border border-slate-200/80 h-36" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white/70 rounded-3xl p-5 border border-slate-200/80 h-44" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* RESULTADOS Y DASHBOARD ANALÍTICO */}
            {/* ========================================================================= */}
            {datos && !cargando && (
              <div className="space-y-6 animate-in fade-in">

                {/* KPI METRIC CARDS EN TONOS PASTEL */}
                {metricasKPI && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {/* Card 1: Mejor Precio (Pastel Sky) */}
                    <div className="bg-gradient-to-br from-white via-sky-50/40 to-sky-100/20 p-4 rounded-3xl border border-sky-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-md">
                      <div className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Mejor Precio Total
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        S/ {metricasKPI.minTotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-sky-700 font-semibold mt-0.5">
                        Producto + Flete optimizado
                      </div>
                    </div>

                    {/* Card 2: Ahorro Máximo (Pastel Mint/Emerald) */}
                    <div className="bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/20 p-4 rounded-3xl border border-emerald-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-md">
                      <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ahorro Máximo
                      </div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">
                        S/ {metricasKPI.ahorroPotencial.toFixed(2)}
                      </div>
                      <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                        vs. opción más costosa
                      </div>
                    </div>

                    {/* Card 3: Entrega Más Rápida (Pastel Lavender/Purple) */}
                    <div className="bg-gradient-to-br from-white via-purple-50/40 to-purple-100/20 p-4 rounded-3xl border border-purple-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-md">
                      <div className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Entrega Rápida
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {metricasKPI.entregaMinima} {metricasKPI.entregaMinima === 1 ? "día" : "días"}
                      </div>
                      <div className="text-xs text-purple-700 font-semibold mt-0.5">
                        Plazo logístico más corto
                      </div>
                    </div>

                    {/* Card 4: Confiabilidad (Pastel Amber/Peach) */}
                    <div className="bg-gradient-to-br from-white via-amber-50/40 to-amber-100/20 p-4 rounded-3xl border border-amber-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-md">
                      <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Score Máximo
                      </div>
                      <div className="text-2xl font-black text-amber-900 mt-1">
                        {Math.round(metricasKPI.scoreMaximo * 100)}%
                      </div>
                      <div className="text-xs text-amber-700 font-semibold mt-0.5">
                        Confiabilidad certificada
                      </div>
                    </div>
                  </div>
                )}

                {/* BANNER DE ADVERTENCIA DE RIESGO DETECTADO */}
                {datos.riesgo_detectado && (
                  <div className="bg-rose-50/90 backdrop-blur-md border border-rose-300/80 rounded-3xl p-5 shadow-xs flex items-start gap-3.5 transition-all">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                      <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          Alerta de Confiabilidad: Riesgo Detectado
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-rose-950 mt-1">
                        Se identificaron ofertas o vendedores con anomalías en esta búsqueda
                      </h4>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        Uno o más resultados evaluados presentan índices de confiabilidad por debajo del
                        umbral seguro (75%), reputación no verificada o precios discrepantes. Te
                        sugerimos priorizar la alternativa recomendada y tiendas con calificaciones comprobadas.
                      </p>
                    </div>
                  </div>
                )}

                {/* AVISO DE PRESUPUESTO AJUSTADO */}
                {ningunProductoEnPresupuesto && (
                  <div className="bg-amber-50/80 backdrop-blur-md rounded-3xl p-5 border border-amber-200/80 shadow-xs flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        Presupuesto ajustado (Límite solicitado: S/ {presNum?.toFixed(2)})
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ninguna de las opciones encontradas cuenta con un costo total menor o igual a tu presupuesto de{" "}
                        <strong className="text-slate-800">S/ {presNum?.toFixed(2)}</strong>. Mostramos las opciones evaluadas para que puedas comparar el diferencial requerido.
                      </p>
                    </div>
                  </div>
                )}

                {/* CARD DE RECOMENDACIÓN FINAL CON BORDE IRIDISCENTE */}
                {datos.recomendacion && tiendaRecomendadaItem && (
                  <section className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 rounded-3xl p-6 sm:p-7 border-2 border-indigo-400/50 shadow-[0_8px_30px_rgb(99,102,241,0.08)] relative overflow-hidden backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/70 pb-4 mb-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 ring-4 ring-indigo-500/10">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                            <span>Evaluación Multicriterio</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-900 font-bold border border-indigo-200/60">
                              Prioridad: {prioridad.toUpperCase()}
                            </span>
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 mt-0.5">
                            {datos.recomendacion.tienda}
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 inline-flex items-center gap-1 shadow-2xs">
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                              Alternativa Óptima
                            </span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setTiendaSeleccionadaModal(tiendaRecomendadaItem)}
                          className="px-4 py-2.5 bg-white/90 hover:bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Ver Desglose</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            manejarAccionComprar(
                              tiendaRecomendadaItem.tienda,
                              tiendaRecomendadaItem.producto,
                              tiendaRecomendadaItem.costo_total,
                              tiendaRecomendadaItem.link
                            )
                          }
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>
                            Ver Oferta (S/ {tiendaRecomendadaItem.costo_total.toFixed(2)})
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4.5 border border-indigo-100/70 shadow-2xs space-y-3">
                      <p className="text-sm text-slate-700 leading-relaxed font-normal">
                        <span className="font-bold text-indigo-950">Fundamento técnico: </span>
                        {datos.recomendacion.motivo}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-600 font-bold">Datos de la oferta:</span>
                        {tiendaRecomendadaItem.garantia && (
                          <span className="inline-flex items-center gap-1 bg-slate-100/80 text-slate-700 px-2.5 py-1 rounded-lg font-semibold border border-slate-200/60">
                            Garantía: {tiendaRecomendadaItem.garantia}
                          </span>
                        )}
                        {tiendaRecomendadaItem.reputacion !== null &&
                          tiendaRecomendadaItem.reputacion !== undefined && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200/70 font-semibold">
                              Reputación: {tiendaRecomendadaItem.reputacion}
                            </span>
                          )}
                        {tiendaRecomendadaItem.empresa_transporte && (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200/70 font-semibold">
                            Transporte: {tiendaRecomendadaItem.empresa_transporte}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/70 font-semibold">
                          Entrega: {tiendaRecomendadaItem.tiempo_entrega_dias} días
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* ========================================================================= */}
                {/* VISTA COMPARATIVA: SELECTOR DE MODO (TARJETAS VS TABLA) */}
                {/* ========================================================================= */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">
                          Catálogo de Ofertas Evaluadas
                        </h3>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          {resultadosMostrados.length} alternativas
                        </span>

                        {datos.desde_cache && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-sky-50 to-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Caché (&lt; 2h)
                          </span>
                        )}
                      </div>

                      {(datos.categoria || datos.tipo) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {datos.categoria && <span>Categoría: <strong>{datos.categoria}</strong></span>}
                          {datos.categoria && datos.tipo && <span> • </span>}
                          {datos.tipo && <span>Tipo: <strong>{datos.tipo}</strong></span>}
                        </p>
                      )}
                    </div>

                    {/* Selector de Vista (Tarjetas vs Tabla) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copiarResumenPortapapeles}
                        className="p-2.5 text-slate-500 hover:text-indigo-700 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                        title="Copiar resumen al portapapeles"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>

                      <div className="inline-flex rounded-xl p-1 bg-slate-100/80 border border-slate-200/80 text-xs shadow-inner">
                        <button
                          type="button"
                          onClick={() => setModoVista("tarjetas")}
                          className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            modoVista === "tarjetas"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          <span>Tarjetas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModoVista("tabla")}
                          className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            modoVista === "tabla"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Tabla</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* VISTA 1: TARJETAS COMPARATIVAS (FINTECH GRID) */}
                  {modoVista === "tarjetas" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                      {resultadosMostrados.map((item, idx) => {
                        const esRecomendada =
                          datos.recomendacion?.tienda &&
                          item.tienda.trim().toLowerCase() ===
                            datos.recomendacion.tienda.trim().toLowerCase();
                        const esRiesgoAlto = item.confiabilidad_score < 0.75;
                        const excedePresupuesto = Boolean(
                          item.excede_presupuesto ||
                            (presNum !== null && item.costo_total > presNum)
                        );

                        return (
                          <div
                            key={`${item.tienda}-${idx}`}
                            className={`bg-white/85 backdrop-blur-xl rounded-3xl p-5 border transition-all duration-300 relative flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 ${
                              esRecomendada
                                ? "border-indigo-400 ring-2 ring-indigo-500/15 shadow-indigo-500/5"
                                : esRiesgoAlto
                                ? "border-rose-300 bg-rose-50/20"
                                : "border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
                            }`}
                          >
                            <div className="space-y-3.5">
                              {/* Header de la tarjeta */}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-100 to-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-xs border border-indigo-100">
                                      {item.tienda.charAt(item.tienda.length - 1)}
                                    </div>
                                    <h4 className="font-bold text-base text-slate-900">
                                      {item.tienda}
                                    </h4>
                                    {esRecomendada && (
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                        ★ Sugerida
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-600 line-clamp-1 mt-1 font-medium">
                                    {item.producto}
                                  </span>
                                </div>
                                <div className="shrink-0">
                                  {renderBadgeConfiabilidad(item.confiabilidad_score)}
                                </div>
                              </div>

                              {/* Breakdown de Precio y Costo Total en Pastel */}
                              <div className="p-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                    Precio Base
                                  </div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    S/ {item.precio.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                    Flete Est.
                                  </div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    {item.envio === 0 ? (
                                      <span className="text-emerald-600 font-bold">Gratis</span>
                                    ) : (
                                      `S/ ${item.envio.toFixed(2)}`
                                    )}
                                  </div>
                                </div>
                                <div className="text-right border-l border-slate-200/80 pl-3.5">
                                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Costo Total
                                  </div>
                                  <div
                                    className={`text-lg font-black ${
                                      excedePresupuesto ? "text-rose-600" : "text-indigo-950"
                                    }`}
                                  >
                                    S/ {item.costo_total.toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              {/* Tags de atributos */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg font-semibold">
                                  Entrega: {item.tiempo_entrega_dias} {item.tiempo_entrega_dias === 1 ? "día" : "días"}
                                </span>
                                {item.empresa_transporte && (
                                  <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-200/60 font-semibold">
                                    Transporte: {item.empresa_transporte}
                                  </span>
                                )}
                                {item.garantia && (
                                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg font-semibold">
                                    Garantía: {item.garantia}
                                  </span>
                                )}
                                {item.reputacion !== null && item.reputacion !== undefined && (
                                  <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-lg border border-amber-200/70 font-semibold">
                                    ★ Rep: {item.reputacion}
                                  </span>
                                )}
                                {excedePresupuesto && (
                                  <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-lg border border-rose-200 font-semibold">
                                    Excede presupuesto
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Botones de acción con micro-interacción */}
                            <div className="flex items-center gap-2 pt-4 mt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setTiendaSeleccionadaModal(item)}
                                className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-all cursor-pointer text-center shadow-2xs hover:shadow-xs"
                              >
                                Ver Detalle
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  manejarAccionComprar(
                                    item.tienda,
                                    item.producto,
                                    item.costo_total,
                                    item.link
                                  )
                                }
                                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer text-center active:scale-95"
                              >
                                Ver Oferta
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* VISTA 2: TABLA MATRICIAL COMPLETA */}
                  {modoVista === "tabla" && (
                    <>
                      <div className="hidden 2xl:block bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        <table className="w-full table-fixed text-left text-sm text-slate-700">
                          <colgroup>
                            <col className="w-[12%]" />
                            <col className="w-[22%]" />
                            <col className="w-[9%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[8%]" />
                            <col className="w-[12%]" />
                            <col className="w-[15%]" />
                          </colgroup>
                          <thead className="bg-slate-100/80 text-xs uppercase font-bold text-slate-700 border-b border-slate-200 select-none">
                            <tr>
                              <th
                                onClick={() => alternarColumna("tienda")}
                                className="py-3.5 px-2.5 cursor-pointer hover:text-indigo-600 transition"
                              >
                                <div className="flex items-center gap-1">
                                  Tienda
                                  {columnaOrden === "tienda" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th
                                onClick={() => alternarColumna("producto")}
                                className="py-3.5 px-2.5 cursor-pointer hover:text-indigo-600 transition"
                              >
                                <div className="flex items-center gap-1">
                                  Producto
                                  {columnaOrden === "producto" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th
                                onClick={() => alternarColumna("precio")}
                                className="py-3.5 px-2 cursor-pointer hover:text-indigo-600 transition text-right"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Precio
                                  {columnaOrden === "precio" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th
                                onClick={() => alternarColumna("envio")}
                                className="py-3.5 px-2 cursor-pointer hover:text-indigo-600 transition text-right"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Envío (Est.)
                                  {columnaOrden === "envio" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th
                                onClick={() => alternarColumna("costo_total")}
                                className="py-3.5 px-2 cursor-pointer hover:text-indigo-600 transition text-right font-extrabold text-slate-900"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Costo Total
                                  {columnaOrden === "costo_total" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th
                                onClick={() => alternarColumna("tiempo_entrega_dias")}
                                className="py-3.5 px-2 cursor-pointer hover:text-indigo-600 transition text-center"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  Entrega
                                  {columnaOrden === "tiempo_entrega_dias" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th
                                onClick={() => alternarColumna("confiabilidad_score")}
                                className="py-3.5 px-2 cursor-pointer hover:text-indigo-600 transition text-center"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  Confiabilidad
                                  {columnaOrden === "confiabilidad_score" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                                </div>
                              </th>
                              <th className="py-3.5 px-2 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {resultadosMostrados.map((tiendaItem, idx) => {
                              const esRecomendada =
                                datos.recomendacion?.tienda &&
                                tiendaItem.tienda.trim().toLowerCase() ===
                                  datos.recomendacion.tienda.trim().toLowerCase();
                              const esRiesgoAlto = tiendaItem.confiabilidad_score < 0.75;
                              const excedePresupuesto = Boolean(
                                tiendaItem.excede_presupuesto ||
                                  (presNum !== null && tiendaItem.costo_total > presNum)
                              );

                              return (
                                <tr
                                  key={`${tiendaItem.tienda}-${idx}`}
                                  className={`transition ${
                                    esRiesgoAlto
                                      ? "opacity-75 bg-rose-50/40 hover:opacity-100"
                                      : excedePresupuesto
                                      ? "opacity-75 bg-slate-50/50 hover:opacity-100"
                                      : "hover:bg-slate-50/80"
                                  } ${esRecomendada ? "bg-indigo-50/30 border-l-4 border-l-indigo-600" : ""}`}
                                >
                                  <td className="py-3 px-2.5 font-semibold text-slate-900 break-words">
                                    <div className="space-y-1">
                                      <div className="flex flex-col items-start gap-1 min-w-0">
                                        <span className="w-full [overflow-wrap:anywhere]">{tiendaItem.tienda}</span>
                                        {esRecomendada && (
                                          <span className="inline-flex max-w-full text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                            ★ Rec.
                                          </span>
                                        )}
                                      </div>
                                      {tiendaItem.reputacion !== null &&
                                        tiendaItem.reputacion !== undefined &&
                                        String(tiendaItem.reputacion).trim() !== "" && (
                                          <div className="text-xs text-amber-700 font-medium">
                                            ★ Rep: {tiendaItem.reputacion}
                                          </div>
                                        )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-2.5 text-slate-700 break-words">
                                    <div className="space-y-1">
                                      <span
                                        className="font-medium text-slate-900 line-clamp-3 [overflow-wrap:anywhere] block"
                                        title={tiendaItem.producto}
                                      >
                                        {tiendaItem.producto}
                                      </span>
                                      {tiendaItem.garantia && (
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                                          Garantía: {tiendaItem.garantia}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-2.5 text-right font-medium text-slate-700">
                                    S/ {tiendaItem.precio.toFixed(2)}
                                  </td>

                                  <td className="py-3 px-2.5 text-right">
                                    <div>
                                      {tiendaItem.envio === 0 ? (
                                        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                                          Gratis
                                        </span>
                                      ) : (
                                        <span className="text-slate-700 font-medium text-xs">
                                          S/ {tiendaItem.envio.toFixed(2)}
                                        </span>
                                      )}
                                      {tiendaItem.empresa_transporte && (
                                        <div className="text-xs text-slate-500 font-normal mt-0.5">
                                          vía {tiendaItem.empresa_transporte}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-2.5 text-right font-extrabold text-base">
                                    <span
                                      className={
                                        excedePresupuesto
                                          ? "text-rose-600 line-through text-sm"
                                          : "text-slate-900"
                                      }
                                    >
                                      S/ {tiendaItem.costo_total.toFixed(2)}
                                    </span>
                                    {excedePresupuesto && (
                                      <div className="mt-0.5">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">
                                          Excede presupuesto
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-2.5 text-center">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                                      {tiendaItem.tiempo_entrega_dias}{" "}
                                      {tiendaItem.tiempo_entrega_dias === 1 ? "día" : "días"}
                                    </span>
                                  </td>

                                  <td className="py-3 px-2.5 text-center">
                                    {renderBadgeConfiabilidad(tiendaItem.confiabilidad_score)}
                                  </td>

                                  <td className="py-3 px-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setTiendaSeleccionadaModal(tiendaItem)}
                                        className="p-2 text-slate-500 hover:text-indigo-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                                        title="Ver detalles"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          manejarAccionComprar(
                                            tiendaItem.tienda,
                                            tiendaItem.producto,
                                            tiendaItem.costo_total,
                                            tiendaItem.link
                                          )
                                        }
                                        className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                                      >
                                        <span>Oferta</span>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 2xl:hidden">
                      {resultadosMostrados.map((item, idx) => {
                        const excedePresupuesto = Boolean(item.excede_presupuesto || (presNum !== null && item.costo_total > presNum));
                        const esRecomendada = datos.recomendacion?.tienda?.trim().toLowerCase() === item.tienda.trim().toLowerCase();
                        return (
                          <article key={`${item.tienda}-${idx}`} className={`rounded-2xl border bg-white/90 p-4 shadow-sm ${esRecomendada ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-bold text-base text-slate-900">{item.tienda}{esRecomendada && <span className="ml-2 text-xs font-semibold text-indigo-700">Recomendada</span>}</h4>
                                <p className="text-sm text-slate-600 mt-1">{item.producto}</p>
                              </div>
                              {renderBadgeConfiabilidad(item.confiabilidad_score)}
                            </div>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
                              <div><dt className="text-slate-500">Precio</dt><dd className="font-semibold">S/ {item.precio.toFixed(2)}</dd></div>
                              <div><dt className="text-slate-500">Envío</dt><dd className="font-semibold">{item.envio === 0 ? "Gratis" : `S/ ${item.envio.toFixed(2)}`}</dd></div>
                              <div><dt className="text-slate-500">Entrega</dt><dd className="font-semibold">{item.tiempo_entrega_dias} {item.tiempo_entrega_dias === 1 ? "día" : "días"}</dd></div>
                              {item.reputacion !== null && item.reputacion !== undefined && <div><dt className="text-slate-500">Reputación</dt><dd className="font-semibold">{item.reputacion}</dd></div>}
                            </dl>
                            <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-3 gap-2">
                              <div><span className="text-xs text-slate-500">Costo total</span><div className={`text-lg font-bold ${excedePresupuesto ? "text-rose-600" : "text-slate-900"}`}>S/ {item.costo_total.toFixed(2)}</div></div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setTiendaSeleccionadaModal(item)} className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50">Detalles</button>
                                <button type="button" onClick={() => manejarAccionComprar(item.tienda, item.producto, item.costo_total, item.link)} className="px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Ver oferta</button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    </>
                  )}

                  {/* Rotulación y Notas */}
                  <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs">
                    <span>
                      * El envío y el plazo de entrega son estimados.
                    </span>
                    <span className="font-bold text-slate-700">
                      Plaza evaluada: {ubicacion.ciudad}, {ubicacion.departamento}
                    </span>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* MÓDULO DE ENVÍO DE RESULTADOS (TELEGRAM / EMAIL) */}
                {/* ========================================================================= */}
                <section className="bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ring-1 ring-slate-900/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Enviar Reporte de Resultados
                      </h3>
                      <p className="text-xs text-slate-500">
                        Recibe la síntesis de esta comparación directamente en tu canal preferido mediante n8n.
                      </p>
                    </div>

                    {/* Selector de Canal */}
                    <div className="inline-flex rounded-xl p-1 bg-slate-100/80 border border-slate-200/80 text-xs shadow-inner">
                      <button
                        type="button"
                        onClick={() => {
                          setCanalEnvio("telegram");
                          setMensajeEnvio(null);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          canalEnvio === "telegram"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                        Telegram
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCanalEnvio("email");
                          setMensajeEnvio(null);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          canalEnvio === "email"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Correo (Resend)
                      </button>
                    </div>
                  </div>

                  <form onSubmit={manejarEnviarResultados} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {canalEnvio === "telegram"
                            ? "Chat ID de Telegram (numérico)"
                            : "Correo Electrónico Verificado"}
                        </label>
                        <input
                          type={canalEnvio === "telegram" ? "text" : "email"}
                          value={destinoEnvio}
                          onChange={(e) => setDestinoEnvio(e.target.value)}
                          placeholder={
                            canalEnvio === "telegram"
                              ? "Ej. 583921829"
                              : "tu-correo-verificado@ejemplo.com"
                          }
                          disabled={enviandoResultados}
                          className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                        />
                      </div>

                      <div className="sm:self-end">
                        <button
                          type="submit"
                          disabled={enviandoResultados || !destinoEnvio.trim()}
                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                        >
                          {enviandoResultados ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <span>Enviar Reporte</span>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {canalEnvio === "telegram" && (
                      <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                        <strong className="text-slate-800">Requisito para Telegram:</strong> Ingresa tu{" "}
                        <span className="font-semibold text-indigo-700">Chat ID numérico</span> (no tu @usuario).
                        Debes haber iniciado conversación al menos una vez con el bot de Telegram de n8n para permitir la entrega.
                      </p>
                    )}

                    {canalEnvio === "email" && (
                      <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                        <strong className="text-slate-800">Nota para Email (Resend):</strong> En entornos de prueba,
                        la entrega solo se garantiza hacia el correo del propietario registrado en la cuenta de Resend.
                      </p>
                    )}

                    {mensajeEnvio && (
                      <div
                        className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                          mensajeEnvio.tipo === "exito"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {mensajeEnvio.tipo === "exito" ? (
                          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span>{mensajeEnvio.texto}</span>
                      </div>
                    )}
                  </form>
                </section>

              </div>
            )}

          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL INTERACTIVO: DESGLOSE TÉCNICO DE LA TIENDA */}
        {/* ========================================================================= */}
        {tiendaSeleccionadaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in">
            <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/80 space-y-5 animate-in zoom-in-95 ring-1 ring-slate-900/10">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-700 tracking-wider">
                    Ficha Técnica de Proveedor
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    {tiendaSeleccionadaModal.tienda}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTiendaSeleccionadaModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Producto evaluado:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {tiendaSeleccionadaModal.producto}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 font-medium">Precio base:</span>
                    <p className="font-bold text-slate-900 text-sm">
                      S/ {tiendaSeleccionadaModal.precio.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Flete logístico:</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {tiendaSeleccionadaModal.envio === 0
                        ? "Gratis (0.00)"
                        : `S/ ${tiendaSeleccionadaModal.envio.toFixed(2)}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Transporte asignado:</span>
                    <p className="font-bold text-slate-900">
                      {tiendaSeleccionadaModal.empresa_transporte || "Transporte no especificado"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Tiempo de entrega:</span>
                    <p className="font-bold text-slate-900">
                      {tiendaSeleccionadaModal.tiempo_entrega_dias} días hábiles
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Garantía declarada:</span>
                    <p className="font-bold text-slate-900">
                      {tiendaSeleccionadaModal.garantia || "Sin garantía registrada"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Score Confiabilidad:</span>
                    <p className="font-bold text-slate-900">
                      {Math.round(tiendaSeleccionadaModal.confiabilidad_score * 100)}% (
                      {tiendaSeleccionadaModal.confiabilidad_score < 0.75 ? "Riesgo" : "Seguro"})
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider">
                      Costo Total Evaluado
                    </div>
                    <div className="text-xl font-black text-indigo-950">
                      S/ {tiendaSeleccionadaModal.costo_total.toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      manejarAccionComprar(
                        tiendaSeleccionadaModal.tienda,
                        tiendaSeleccionadaModal.producto,
                        tiendaSeleccionadaModal.costo_total,
                        tiendaSeleccionadaModal.link
                      );
                      setTiendaSeleccionadaModal(null);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Abrir Oferta Externa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

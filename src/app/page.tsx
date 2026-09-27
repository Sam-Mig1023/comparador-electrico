"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BusquedaRequest,
  BusquedaResponse,
  ResultadoTienda,
  UbicacionDetalle,
  TipoPrioridad,
} from "../types";

// Ubicaciones comunes preconfiguradas
const UBICACIONES_DISPONIBLES: UbicacionDetalle[] = [
  { ciudad: "Trujillo", departamento: "La Libertad" },
  { ciudad: "Lima", departamento: "Lima Metropolitana" },
  { ciudad: "Arequipa", departamento: "Arequipa" },
  { ciudad: "Chiclayo", departamento: "Lambayeque" },
  { ciudad: "Piura", departamento: "Piura" },
  { ciudad: "Cusco", departamento: "Cusco" },
];

interface BusquedaReciente {
  consulta: string;
  ciudad: string;
  departamento: string;
  prioridad: TipoPrioridad;
  fecha: string;
}

export default function Home() {
  // Estados de entrada y configuración
  const [consulta, setConsulta] = useState("");
  const [ubicacion, setUbicacion] = useState<UbicacionDetalle>({
    ciudad: "Trujillo",
    departamento: "La Libertad",
  });
  const [presupuestoMaximo, setPresupuestoMaximo] = useState<string>("");
  const [prioridad, setPrioridad] = useState<TipoPrioridad>("balanceado");

  // Estados de carga e interactividad
  const [cargando, setCargando] = useState(false);
  const [mensajeCargaIndex, setMensajeCargaIndex] = useState(0);

  // Estados de respuesta, historial y notificaciones
  const [datos, setDatos] = useState<BusquedaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busquedasRecientes, setBusquedasRecientes] = useState<BusquedaReciente[]>([]);
  const [notificacionCompra, setNotificacionCompra] = useState<string | null>(null);

  // Ordenamiento manual opcional de columnas en la tabla
  const [columnaOrden, setColumnaOrden] = useState<keyof ResultadoTienda | null>(null);
  const [direccionOrden, setDireccionOrden] = useState<"asc" | "desc">("asc");

  // Mensajes dinámicos durante la simulación de espera de 3 segundos
  const mensajesCarga = useMemo(
    () => [
      "Interpretando búsqueda con IA en CompraSmart...",
      `Consultando tiendas en tiempo real en ${ubicacion.ciudad}...`,
      "Calculando costos y ranking de confiabilidad...",
    ],
    [ubicacion.ciudad]
  );

  // Cargar historial de localStorage al inicializar
  useEffect(() => {
    try {
      const guardadas = localStorage.getItem("comprasmart_busquedas_recientes");
      if (guardadas) {
        setBusquedasRecientes(JSON.parse(guardadas));
      }
    } catch {
      // Ignorar fallas de lectura en entornos restringidos
    }
  }, []);

  // Guardar búsqueda en el historial local (usuario_id)
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

  // Alternancia de mensajes durante la carga
  useEffect(() => {
    let intervalo: NodeJS.Timeout;
    if (cargando) {
      setMensajeCargaIndex(0);
      intervalo = setInterval(() => {
        setMensajeCargaIndex((prev) => (prev < mensajesCarga.length - 1 ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [cargando, mensajesCarga.length]);

  // Ejecución de la búsqueda: Petición real POST hacia /api/buscar
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
      setError("Por favor, ingresa el producto o consulta que deseas comparar.");
      return;
    }

    setError(null);
    setCargando(true);
    setDatos(null);
    setColumnaOrden(null);

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
        throw new Error(
          "Hubo un problema al conectar con el servidor de análisis. Por favor, inténtelo de nuevo."
        );
      }

      const respuestaData: BusquedaResponse = await respuesta.json();
      setDatos(respuestaData);
      guardarEnHistorial(textoFinal, ubicacionFinal, prioridadFinal);
    } catch {
      setError(
        "Hubo un problema al conectar con el servidor de análisis. Por favor, inténtelo de nuevo."
      );
    } finally {
      // Garantizar que la pantalla nunca se quede colgada en 'cargando'
      setCargando(false);
    }
  };

  // Disparar búsqueda al cambiar de prioridad (Flujo cliente-servidor)
  const cambiarPrioridadYBuscar = (nuevaPrioridad: TipoPrioridad) => {
    setPrioridad(nuevaPrioridad);
    if (consulta.trim()) {
      ejecutarBusqueda(consulta, ubicacion, nuevaPrioridad, presupuestoMaximo);
    }
  };

  // Disparar búsqueda al aplicar presupuesto
  const aplicarPresupuestoYBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (consulta.trim()) {
      ejecutarBusqueda(consulta, ubicacion, prioridad, presupuestoMaximo);
    }
  };

  const manejarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda();
  };

  // Seleccionar desde el historial y rellenar formulario
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

  // Ordenar columnas interactivamente en la tabla
  const alternarColumna = (columna: keyof ResultadoTienda) => {
    if (columnaOrden === columna) {
      setDireccionOrden((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setColumnaOrden(columna);
      setDireccionOrden("asc");
    }
  };

  // Lista de resultados mostrados
  const resultadosMostrados = useMemo(() => {
    if (!datos?.resultados) return [];
    if (!columnaOrden) return datos.resultados;

    return [...datos.resultados].sort((a, b) => {
      const valA = a[columnaOrden];
      const valB = b[columnaOrden];
      if (typeof valA === "number" && typeof valB === "number") {
        return direccionOrden === "asc" ? valA - valB : valB - valA;
      }
      return direccionOrden === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [datos, columnaOrden, direccionOrden]);

  // Validación de Presupuesto Estricto (Sección 5.1):
  // Detectar si el usuario ingresó un presupuesto_maximo y NINGÚN producto es menor o igual
  const presNum = presupuestoMaximo ? Number(presupuestoMaximo) : null;
  const ningunProductoEnPresupuesto = Boolean(
    presNum !== null &&
    presNum > 0 &&
    datos?.resultados &&
    datos.resultados.length > 0 &&
    datos.resultados.every((item) => item.costo_total > presNum)
  );

  // Manejador del botón 'Comprar' / 'Ver Oferta'
  const manejarAccionComprar = (tienda: string, producto: string, costoTotal: number, link?: string) => {
    setNotificacionCompra(
      `Redirigiendo de forma segura a la pasarela oficial de ${tienda} para adquirir ${producto} por S/ ${costoTotal.toFixed(2)}...`
    );
    setTimeout(() => {
      setNotificacionCompra(null);
      if (link?.trim()) {
        window.open(link, "_blank");
      }
    }, 4500);
  };

  // Helper para renderizar badges de Confiabilidad (Mitigación de riesgo: < 0.75 Riesgo Alto)
  const renderBadgeConfiabilidad = (score: number) => {
    const porcentaje = Math.round(score * 100);

    if (score < 0.75) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          ⚠️ Riesgo Alto ({porcentaje}%)
        </span>
      );
    }
    if (score >= 0.85) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Alta ({porcentaje}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Media ({porcentaje}%)
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Notificación flotante de compra */}
      {notificacionCompra && (
        <div className="fixed top-5 right-5 z-50 max-w-md p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0">
            ✓
          </div>
          <p className="text-xs font-medium text-slate-100">{notificacionCompra}</p>
        </div>
      )}

      {/* Barra de navegación superior CompraSmart en fondo blanco puro */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-1">
                CompraSmart
              </span>
              <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold block -mt-1">
                Plataforma Inteligente de Compras
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Motor de Decisión n8n Conectado</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 flex-1">
        
        {/* Cabecera y branding con fondo claro */}
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <span>⚡ Arquitectura Next.js + n8n</span>
            <span>•</span>
            <span>Optimización Multi-criterio</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Toma decisiones de compra con{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
              CompraSmart
            </span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Comparamos precios reales, flete a tu ciudad, velocidad de entrega, garantías y mitigamos
            tiendas de riesgo con algoritmos predictivos.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* PANEL LATERAL DE CONFIGURACIÓN Y ÁREA CENTRAL (DISEÑO CLARO) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Panel Lateral: Parámetros del Servidor */}
          <aside className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Parámetros del Servidor
              </h2>

              {/* Selector de Ubicación */}
              <div className="space-y-1.5">
                <label htmlFor="ubicacion" className="block text-xs font-semibold text-slate-700">
                  Ubicación de entrega
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition appearance-none cursor-pointer"
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
                <p className="text-[11px] text-slate-500">Por defecto: Trujillo (La Libertad)</p>
              </div>

              {/* Input Numérico de Presupuesto con botón de filtrado */}
              <form onSubmit={aplicarPresupuestoYBuscar} className="space-y-1.5">
                <label htmlFor="presupuesto" className="block text-xs font-semibold text-slate-700">
                  Presupuesto máximo <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                    S/
                  </div>
                  <input
                    id="presupuesto"
                    type="number"
                    min="0"
                    step="1"
                    value={presupuestoMaximo}
                    onChange={(e) => setPresupuestoMaximo(e.target.value)}
                    placeholder="Ej. 240"
                    disabled={cargando}
                    className="w-full pl-8 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition"
                  />
                  <button
                    type="submit"
                    disabled={cargando}
                    className="absolute inset-y-1 right-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Filtrar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Filtra o advierte opciones que superen el monto
                </p>
              </form>

              {/* Filtros de Prioridad Interactivos (Pill Buttons) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  Criterio de Prioridad (Servidor)
                </label>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("balanceado")}
                    disabled={cargando}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      prioridad === "balanceado"
                        ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <span>⚖️ Balanceado (IA)</span>
                    {prioridad === "balanceado" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("costo")}
                    disabled={cargando}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      prioridad === "costo"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <span>💰 Priorizar Menor Costo</span>
                    {prioridad === "costo" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("envio")}
                    disabled={cargando}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      prioridad === "envio"
                        ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <span>⚡ Priorizar Envío Rápido</span>
                    {prioridad === "envio" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarPrioridadYBuscar("reputacion")}
                    disabled={cargando}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      prioridad === "reputacion"
                        ? "bg-amber-50 text-amber-800 border border-amber-200 font-semibold shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <span>⭐ Priorizar Reputación</span>
                    {prioridad === "reputacion" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Búsquedas Recientes (localStorage / Sesión de usuario) */}
            {busquedasRecientes.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Búsquedas Recientes
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedasRecientes([]);
                      try {
                        localStorage.removeItem("comprasmart_busquedas_recientes");
                      } catch {}
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="space-y-1.5">
                  {busquedasRecientes.map((reciente, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => seleccionarDesdeHistorial(reciente)}
                      className="w-full text-left p-2 rounded-xl text-xs hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition group flex items-center justify-between cursor-pointer"
                      title="Haz clic para rellenar este término y consultar"
                    >
                      <span className="truncate font-medium text-slate-700 group-hover:text-blue-700">
                        {reciente.consulta}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {reciente.ciudad}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Área Principal: Chatbot, Skeleton y Resultados */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* CHATBOT / CAJA DE BÚSQUEDA INTERACTIVA EN FONDO BLANCO */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
              <form onSubmit={manejarSubmit} className="space-y-3">
                <div className="relative">
                  <div className="absolute top-4 left-4 pointer-events-none text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <textarea
                    rows={2}
                    value={consulta}
                    onChange={(e) => setConsulta(e.target.value)}
                    placeholder="Quiero un teclado mecánico inalámbrico de máximo S/300 en Trujillo..."
                    disabled={cargando}
                    className="w-full pl-12 pr-28 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ejecutarBusqueda();
                      }
                    }}
                  />
                  <div className="absolute bottom-3.5 right-3">
                    <button
                      type="submit"
                      disabled={cargando || !consulta.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {cargando ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Analizando...</span>
                        </>
                      ) : (
                        <>
                          <span>Consultar IA</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Chips de sugerencias rápidas */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Ejemplos rápidos:</span>
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
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent text-slate-600 transition cursor-pointer"
                    >
                      {ejemplo}
                    </button>
                  ))}
                </div>
              </form>

              {/* BANNER DE ERROR ROBUSTO */}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3 shadow-2xs">
                  <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="space-y-1">
                    <p className="font-bold text-rose-900">Aviso del Sistema CompraSmart</p>
                    <p>{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => ejecutarBusqueda()}
                    className="ml-auto px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SKELETON LOADER INTELIGENTE CON PARPADEO DINÁMICO */}
            {/* ========================================================================= */}
            {cargando && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-spin">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 animate-pulse">
                      {mensajesCarga[mensajeCargaIndex]}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Procesando tiendas oficiales y mitigando riesgos con IA...
                    </p>
                  </div>
                  <div className="w-56 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${((mensajeCargaIndex + 1) / mensajesCarga.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Siluetas animadas (Skeleton) */}
                <div className="space-y-4 animate-pulse">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="h-5 w-48 bg-slate-200 rounded-lg" />
                    <div className="h-8 w-64 bg-slate-200 rounded-lg" />
                    <div className="h-16 w-full bg-slate-100 rounded-xl" />
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                    <div className="h-6 w-36 bg-slate-200 rounded-md" />
                    <div className="space-y-2 pt-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-12 w-full bg-slate-100 rounded-xl" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VISTA DE RESULTADOS (CUANDO HAY DATOS Y NO ESTÁ CARGANDO) */}
            {/* ========================================================================= */}
            {datos && !cargando && (
              <div className="space-y-6">

                {/* CONTINGENCIA SECCIÓN 5.1: CONTROL DE PRESUPUESTO ESTRICTO */}
                {ningunProductoEnPresupuesto && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 text-lg">
                      ⚠️
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        Presupuesto ajustado (Límite: S/ {presNum?.toFixed(2)})
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ninguna de las tiendas evaluadas cuenta con un costo total menor o igual a tu presupuesto de{" "}
                        <strong className="text-slate-800">S/ {presNum?.toFixed(2)}</strong>. Mostramos la lista
                        completa de opciones abajo para permitirte comparar alternativas cercanas o evaluar un ajuste en tu presupuesto.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* VISTA DE RECOMENDACIÓN FINAL GENERADA POR EL SERVIDOR */}
                {datos.recomendacion && (
                  <section className="bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50 rounded-2xl p-6 sm:p-7 border-2 border-blue-500/80 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-4 mb-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 font-bold">
                          💡
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                            <span>Recomendación Inteligente de CompraSmart</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                              Prioridad: {prioridad.toUpperCase()}
                            </span>
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 mt-0.5">
                            {datos.recomendacion.tienda}
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🏆 Mejor Opción
                            </span>
                          </h2>
                        </div>
                      </div>

                      {/* Botón de Compra Destacado con Azul Corporativo Sólido */}
                      {datos.resultados[0] && (
                        <button
                          type="button"
                          onClick={() =>
                            manejarAccionComprar(
                              datos.recomendacion.tienda,
                              datos.resultados[0].producto,
                              datos.resultados[0].costo_total
                            )
                          }
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span>Ver Oferta (S/ {datos.resultados[0].costo_total.toFixed(2)})</span>
                        </button>
                      )}
                    </div>

                    {/* Motivo dinámico calculado por el servidor */}
                    <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
                      <p className="text-sm text-slate-700 leading-relaxed font-normal">
                        <span className="font-semibold text-blue-950">Motivo del análisis: </span>
                        {datos.recomendacion.motivo}
                      </p>
                    </div>
                  </section>
                )}

                {/* VISTA DE RESULTADOS COMPARATIVOS: TABLA SAAS PREMIUM */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  
                  {/* Barra superior de la tabla */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Ranking de Tiendas Evaluadas</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {resultadosMostrados.length} opciones
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Filtro de servidor activo: <strong className="text-blue-700 uppercase">{prioridad}</strong>
                        {columnaOrden && ` • Reordenado por columna: ${columnaOrden}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {presupuestoMaximo && (
                        <span className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                          Presupuesto límite: <strong className="text-slate-900">S/ {Number(presupuestoMaximo).toFixed(2)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabla interactiva con mitigación de tiendas de riesgo */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200 select-none">
                        <tr>
                          <th
                            onClick={() => alternarColumna("tienda")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition"
                          >
                            <div className="flex items-center gap-1">
                              Tienda
                              {columnaOrden === "tienda" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          <th
                            onClick={() => alternarColumna("producto")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition"
                          >
                            <div className="flex items-center gap-1">
                              Producto
                              {columnaOrden === "producto" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          <th
                            onClick={() => alternarColumna("precio")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition text-right"
                          >
                            <div className="flex items-center justify-end gap-1">
                              Precio
                              {columnaOrden === "precio" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          <th
                            onClick={() => alternarColumna("envio")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition text-right"
                          >
                            <div className="flex items-center justify-end gap-1">
                              Envío
                              {columnaOrden === "envio" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          <th
                            onClick={() => alternarColumna("costo_total")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition text-right font-extrabold text-slate-900"
                          >
                            <div className="flex items-center justify-end gap-1">
                              Costo Total
                              {columnaOrden === "costo_total" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          <th
                            onClick={() => alternarColumna("tiempo_entrega_dias")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition text-center"
                          >
                            <div className="flex items-center justify-center gap-1">
                              Entrega
                              {columnaOrden === "tiempo_entrega_dias" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          {/* Columna Confiabilidad con Mitigación de Riesgo */}
                          <th
                            onClick={() => alternarColumna("confiabilidad_score")}
                            className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition text-center"
                          >
                            <div className="flex items-center justify-center gap-1">
                              Confiabilidad
                              {columnaOrden === "confiabilidad_score" && (direccionOrden === "asc" ? " ▲" : " ▼")}
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-center">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resultadosMostrados.map((tiendaItem, idx) => {
                          const esGanadora = idx === 0;
                          const esRiesgoAlto = tiendaItem.confiabilidad_score < 0.75;
                          const excedePresupuesto = Boolean(tiendaItem.excede_presupuesto);

                          return (
                            <tr
                              key={`${tiendaItem.tienda}-${idx}`}
                              className={`transition ${
                                esRiesgoAlto
                                  ? "opacity-70 bg-rose-50/40 hover:opacity-100"
                                  : excedePresupuesto
                                  ? "opacity-75 bg-slate-50/50 hover:opacity-100"
                                  : "hover:bg-slate-50/80"
                              } ${esGanadora ? "bg-blue-50/30 border-l-4 border-l-blue-600" : ""}`}
                            >
                              {/* Tienda */}
                              <td className="py-4 px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span>{tiendaItem.tienda}</span>
                                  {esGanadora && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                      ★ Ganadora
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Producto */}
                              <td className="py-4 px-4 text-slate-600">
                                {tiendaItem.producto}
                              </td>

                              {/* Precio con S/ */}
                              <td className="py-4 px-4 text-right font-medium text-slate-700">
                                S/ {tiendaItem.precio.toFixed(2)}
                              </td>

                              {/* Envío */}
                              <td className="py-4 px-4 text-right">
                                {tiendaItem.envio === 0 ? (
                                  <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Gratis
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-medium">
                                    S/ {tiendaItem.envio.toFixed(2)}
                                  </span>
                                )}
                              </td>

                              {/* Costo Total */}
                              <td className="py-4 px-4 text-right font-extrabold text-base">
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
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200">
                                      Excede presupuesto
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Tiempo de entrega */}
                              <td className="py-4 px-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                  {tiendaItem.tiempo_entrega_dias}{" "}
                                  {tiendaItem.tiempo_entrega_dias === 1 ? "día" : "días"}
                                </span>
                              </td>

                              {/* Confiabilidad con Mitigación de Tiendas poco Confiables */}
                              <td className="py-4 px-4 text-center">
                                {renderBadgeConfiabilidad(tiendaItem.confiabilidad_score)}
                              </td>

                              {/* Botón de Acción 'Ver Oferta' / 'Comprar' Azul Corporativo Sólido */}
                              <td className="py-4 px-4 text-center">
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
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>Ver Oferta</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer de la tabla con Detalle del Snapshot de Datos (Sección 5.3) */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-1.5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        * Todos los montos se muestran en Soles peruanos (S/) e incluyen IGV y flete oficial.
                      </span>
                      <span className="font-medium text-slate-600">
                        Entregas calculadas para: {ubicacion.ciudad}, {ubicacion.departamento}
                      </span>
                    </div>
                    {/* Texto específico de la Sección 5.3 del informe académico */}
                    <p className="text-slate-400 text-xs text-center sm:text-left pt-1 border-t border-slate-200/60">
                      Nota: Mostrando snapshot de datos optimizado para Trujillo. Fuentes verificadas: MercadoLibre API y SerpAPI
                    </p>
                  </div>
                </section>

              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}

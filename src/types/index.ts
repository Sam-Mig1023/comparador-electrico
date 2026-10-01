/**
 * Interfaces TypeScript para el Comparador Eléctrico (CompraSmart)
 * Respetando estrictamente el español y la estructura definida en contrato-n8n.json
 */

export interface UbicacionDetalle {
  ciudad: string;
  departamento: string;
}

export type TipoPrioridad = "costo" | "envio" | "reputacion" | "balanceado";

/**
 * Interfaz para la solicitud de búsqueda enviada desde el frontend hacia /api/buscar.
 */
export interface BusquedaRequest {
  consulta: string;
  ubicacion: string | UbicacionDetalle;
  presupuesto_maximo?: number | null;
  usuario_id?: string;
  prioridad?: TipoPrioridad;
}

/**
 * Interfaz que representa el detalle de un producto ofrecido por una tienda.
 */
export interface ResultadoTienda {
  tienda: string;
  producto: string;
  link?: string;
  precio: number;
  envio: number;
  empresa_transporte?: string | null;
  costo_total: number;
  tiempo_entrega_dias: number;
  garantia: string | null;
  reputacion: number | string | null;
  confiabilidad_score: number;
  excede_presupuesto?: boolean;
  categoria?: string;
  tipo?: string;
}

/**
 * Interfaz para la tienda recomendada con su respectivo motivo/análisis.
 */
export interface Recomendacion {
  tienda: string;
  motivo: string;
}

/**
 * Interfaz principal para la respuesta del comparador (acorde a contrato-n8n.json).
 */
export interface BusquedaResponse {
  producto_buscado: string;
  categoria?: string;
  tipo?: string;
  desde_cache?: boolean;
  riesgo_detectado?: boolean;
  resultados: ResultadoTienda[];
  recomendacion: Recomendacion;
}

/**
 * Canales disponibles para el envío de resultados.
 */
export type CanalEnvio = "telegram" | "email";

/**
 * Estructura de producto para el webhook de envío de resultados.
 */
export interface ProductoEnvio {
  nombre: string;
  precio: number;
  tienda: string;
  url?: string;
}

/**
 * Solicitud al endpoint /api/enviar y al webhook n8n de envío.
 */
export interface EnviarResultadosRequest {
  canal: CanalEnvio;
  destino: string;
  consulta?: string;
  productos: ProductoEnvio[];
  recomendacion?: Recomendacion;
}

/**
 * Respuesta del endpoint /api/enviar.
 */
export interface EnviarResultadosResponse {
  ok?: boolean;
  mensaje?: string;
  error?: string;
}

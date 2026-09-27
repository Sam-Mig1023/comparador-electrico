/**
 * Interfaces TypeScript para el Comparador Eléctrico
 * Respetando estrictamente el español y la estructura definida en contrato-n8n.json
 */

export interface UbicacionDetalle {
  ciudad: string;
  departamento: string;
}

export type TipoPrioridad = "costo" | "envio" | "reputacion" | "balanceado";

/**
 * Interfaz para la solicitud de búsqueda enviada desde el frontend.
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
  costo_total: number;
  tiempo_entrega_dias: number;
  garantia: string;
  reputacion: number;
  confiabilidad_score: number;
  excede_presupuesto?: boolean;
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
  resultados: ResultadoTienda[];
  recomendacion: Recomendacion;
}

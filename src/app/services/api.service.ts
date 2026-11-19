import { Injectable } from '@angular/core';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import type {
  MidagriApiResponse,
  MidagriProductor,
  ParticipanteResponse,
  PersonaIdentityResult,
  ReniecResponse
} from '../interfaces/api.interfaces';
import type { RegistroParcelaApiPage, RegistroParcelaApiRecord } from '../interfaces/register-data.interfaces';
import { environment } from '../../environments/environment';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRegistroParcelaApiRecord(value: unknown): value is RegistroParcelaApiRecord {
  return isObject(value)
    && typeof value['internalKey'] === 'string'
    && typeof value['dniProductor'] === 'string'
    && typeof value['nombres'] === 'string'
    && typeof value['geom'] === 'string'
    && typeof value['datum'] === 'string'
    && typeof value['profesionalDni'] === 'string'
    && typeof value['fechaCreacion'] === 'string'
    && typeof value['fechaActualizacion'] === 'string'
    && typeof value['eliminado'] === 'boolean';
}

export function toBackendJson(payload: Record<string, unknown>): Record<string, unknown> {
  const backendPayload: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(payload)) {
    const backendField = field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    backendPayload[backendField] = value;
  }
  return backendPayload;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isParticipanteResponse(value: unknown): value is ParticipanteResponse {
  return isObject(value)
    && typeof value['dni'] === 'string'
    && isOptionalString(value['nombres'])
    && isOptionalString(value['apellidoPaterno'])
    && isOptionalString(value['apellidoMaterno'])
    && isOptionalString(value['fechaNacimiento'])
    && isOptionalString(value['sexo']);
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Considera mover este token a environment.ts para una mejor gestión y seguridad
  private readonly reniecToken: string = 'sk_2622.FO9PZhk5V73qfhjWluim7DJ4gOCjG8al';

  constructor() { }

  async getReniecData(dni: string): Promise<ReniecResponse | null> {
    console.log(`[ApiService] Iniciando getReniecData para DNI: ${dni}`);
    try {
      // La URL del servicio de consulta de RENIEC es un endpoint externo y fijo.
      // Es independiente del 'apiUrl' de nuestro backend definido en los archivos de entorno.
      const url = `https://api.decolecta.com/v1/reniec/dni?numero=${dni}`;
      console.log(`[ApiService] Consultando URL RENIEC: ${url}`);

      const response: HttpResponse = await CapacitorHttp.get({
        url,
        headers: { Authorization: `Bearer ${this.reniecToken}` }
      });

      console.log(`[ApiService] Respuesta de RENIEC recibida. Status: ${response.status}`);
      console.log('[ApiService] Datos de RENIEC:', JSON.stringify(response.data));

      if (response.status === 200 && response.data && (response.data as ReniecResponse).first_name) {
        console.log('[ApiService] RENIEC: Éxito, datos válidos encontrados.');
        return response.data as ReniecResponse;
      } else {
        console.warn('[ApiService] RENIEC: Respuesta no exitosa o datos inválidos.');
        return null;
      }
    } catch (error: any) {
      console.error(`[ApiService] Error crítico en getReniecData: ${error.message}`);
      console.error('[ApiService] Detalles del error RENIEC:', error);
      throw new Error(`Error al consultar RENIEC: ${error.message || 'Error desconocido'}`); // Propagar el error para manejo en el componente
    }
  }

  async getParticipanteData(dni: string): Promise<ParticipanteResponse | null> {
    const url = `${environment.apiUrl}/api/participantes?dni=${encodeURIComponent(dni)}`;
    const response = await CapacitorHttp.get({
      url,
      headers: { Accept: 'application/json' }
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`[ApiService] Error HTTP ${response.status} al consultar participantes.`);
    }

    const body: unknown = response.data;
    if (!Array.isArray(body) || !body.every(isParticipanteResponse)) {
      throw new Error('[ApiService] La respuesta de participantes no tiene el formato documentado.');
    }

    return body.find(participante => participante.dni === dni) ?? null;
  }

  async getParticipanteOrReniecData(dni: string): Promise<PersonaIdentityResult | null> {
    try {
      const participante = await this.getParticipanteData(dni);
      if (participante) {
        return {
          data: {
            first_name: participante.nombres || '',
            first_last_name: participante.apellidoPaterno || '',
            second_last_name: participante.apellidoMaterno || '',
            ...(participante.fechaNacimiento ? { birthday: participante.fechaNacimiento } : {}),
            ...(participante.sexo ? { sex: participante.sexo } : {})
          },
          source: 'Participantes'
        };
      }
    } catch (error) {
      console.warn('[ApiService] No se pudo consultar participantes; se intentará con RENIEC:', error);
    }

    const reniecData = await this.getReniecData(dni);
    return reniecData ? { data: reniecData, source: 'RENIEC' } : null;
  }

  async getMidagriData(dni: string): Promise<MidagriProductor | null> {
    console.log(`[ApiService] Iniciando getMidagriData para DNI: ${dni}`);
    try {
      const url = `https://gateway.midagri.gob.pe/sisppa/api/services/app/Consulta/GetDatosProductor?codDocumento=1&Documento=${dni}`;
      console.log(`[ApiService] Consultando URL MIDAGRI: ${url}`);

      const response: HttpResponse = await CapacitorHttp.get({ url });
      const midagriData = response.data as MidagriApiResponse;

      console.log(`[ApiService] Respuesta de MIDAGRI recibida. Status: ${response.status}`);
      console.log('[ApiService] Datos de MIDAGRI:', JSON.stringify(midagriData));

      if (response.status === 200 && midagriData && midagriData.success && midagriData.result) {
        if (Array.isArray(midagriData.result) && midagriData.result.length > 0) {
          console.log('[ApiService] MIDAGRI: Éxito, se encontró un array de resultados. Usando el primero.');
          return midagriData.result[0]; // Si es un array, toma el primer elemento
        } else if (!Array.isArray(midagriData.result) && typeof midagriData.result === 'object' && midagriData.result !== null) {
          console.log('[ApiService] MIDAGRI: Éxito, se encontró un objeto de resultado.');
          return midagriData.result; // Si es un objeto, úsalo directamente
        }
      }
      console.warn('[ApiService] MIDAGRI: Respuesta no exitosa o sin resultados válidos.');
      return null;
    } catch (error: any) {
      console.error(`[ApiService] Error crítico en getMidagriData: ${error.message}`);
      console.error('[ApiService] Detalles del error MIDAGRI:', error);
      throw new Error(`Error al consultar MIDAGRI: ${error.message || 'Error desconocido'}`); // Propagar el error
    }
  }

  /**
   * Envía un lote de registros pre-procesados al backend.
   * @param payloads Un array de objetos de datos listos para ser enviados. Cada objeto debe tener la geometría en formato WKT.
   */
  async enviarRegistros(payloads: any[]): Promise<HttpResponse> {
    const url = `${environment.apiUrl}/registros`;
    console.log(`[ApiService] Iniciando enviarRegistros a URL: ${url} con ${payloads.length} registros.`);

    // La sanitización ahora se hace para cada payload en el array.
    const sanitizedPayloads = payloads.map(p => {
      const sanitizedPayload = { ...p };
      const superficieStr = sanitizedPayload.SUPERFICIE_MIDAGRI;

      if (superficieStr && typeof superficieStr === 'string') {
        const superficieNum = Number.parseFloat(superficieStr);
        sanitizedPayload.SUPERFICIE_MIDAGRI = Number.isNaN(superficieNum) ? null : superficieNum;
      } else if (typeof sanitizedPayload.SUPERFICIE_MIDAGRI !== 'number') {
        sanitizedPayload.SUPERFICIE_MIDAGRI = null;
      }
      return sanitizedPayload;
    });

    console.log('[ApiService] Payloads sanitizados para envío en lote:', JSON.stringify(sanitizedPayloads));

    try {
      const response = await CapacitorHttp.post({
        url,
        data: sanitizedPayloads,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[ApiService] Respuesta de enviarRegistros recibida. Status: ${response.status}`);
      console.log('[ApiService] Datos de respuesta (lote):', JSON.stringify(response.data));
      return response;
    } catch (error: any) {
      console.error(`[ApiService] Error crítico en enviarRegistros: ${error.message}`);
      console.error('[ApiService] Detalles del error (lote):', error);
      throw error; // Re-lanzar el error para que el llamador lo maneje
    }
  }

  /**
   * Envía un único registro pre-procesado al backend.
   * El backend espera un objeto JSON individual (no un array).
   * @param payload El objeto de datos listo para ser enviado como JSON.
   */
  async enviarRegistroIndividual(payload: any): Promise<HttpResponse> {
    const url = `${environment.apiUrl}/api/parcelas`;
    console.log(`[ApiService] Iniciando enviarRegistroIndividual a URL: ${url}`);

    const sanitizedPayload = this.buildRegistroPayload(payload);
    const geometryLength = typeof sanitizedPayload.geom === 'string' ? sanitizedPayload.geom.length : 0;
    const startedAt = Date.now();
    console.log(`[ApiService] Enviando ${Object.keys(sanitizedPayload).length} campos; geom=${geometryLength} caracteres.`);

    try {
      const response = await CapacitorHttp.post({
        url,
        data: sanitizedPayload,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[ApiService] Envío terminado. Status: ${response.status}, duración: ${Date.now() - startedAt} ms.`);
      console.log('[ApiService] Datos de respuesta (individual):', JSON.stringify(response.data));
      return response;
    } catch (error: any) {
      console.error(`[ApiService] Error crítico en enviarRegistroIndividual: ${error.message}`);
      console.error('[ApiService] Detalles del error (individual):', error);
      throw error;
    }
  }

  async listarParcelas(page = 0, size = 50): Promise<RegistroParcelaApiPage> {
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
      throw new Error('[ApiService] La paginación debe tener page >= 0 y size entre 1 y 100.');
    }

    const url = `${environment.apiUrl}/api/parcelas?page=${page}&size=${size}`;
    try {
      const response = await CapacitorHttp.get({
        url,
        headers: { Accept: 'application/json' }
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`[ApiService] Error HTTP ${response.status} al consultar las parcelas.`);
      }

      const body: unknown = response.data;
      if (!isObject(body)
        || typeof body['success'] !== 'boolean'
        || typeof body['page'] !== 'number'
        || typeof body['size'] !== 'number'
        || typeof body['total'] !== 'number'
        || typeof body['totalPages'] !== 'number'
        || !Array.isArray(body['data'])
        || !body['data'].every(isRegistroParcelaApiRecord)) {
        throw new Error('[ApiService] La respuesta de parcelas no tiene el formato documentado.');
      }

      return {
        success: body['success'],
        data: body['data'],
        page: body['page'],
        size: body['size'],
        total: body['total'],
        totalPages: body['totalPages']
      };
    } catch (error) {
      console.error('[ApiService] Error al leer parcelas del backend:', error);
      throw error;
    }
  }

  private buildRegistroPayload(payload: any): any {
    const result: any = {};

    if (payload && typeof payload.internal_key === 'string') {
      result.internal_key = payload.internal_key.substring(0, 64);
    } else {
      throw new Error('[ApiService] El campo internal_key es obligatorio y debe ser un string de máximo 64 caracteres.');
    }

    if (payload && typeof payload.dni_productor === 'string' && /^\d{8}$/.test(payload.dni_productor)) {
      result.dni_productor = payload.dni_productor;
    } else if (payload && typeof payload.dni_productor === 'string') {
      const numeric = Number(payload.dni_productor);
      if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 99999999) {
        result.dni_productor = String(numeric).padStart(8, '0');
      } else {
        throw new Error('[ApiService] El campo dni_productor debe ser exactamente 8 dígitos.');
      }
    } else {
      throw new Error('[ApiService] El campo dni_productor es obligatorio y debe tener 8 dígitos.');
    }

    if (payload && typeof payload.nombres === 'string') {
      result.nombres = payload.nombres.substring(0, 100).trim();
      if (result.nombres === '') {
        throw new Error('[ApiService] El campo nombres no puede estar vacío.');
      }
    } else {
      throw new Error('[ApiService] El campo nombres es obligatorio.');
    }

    if (payload && typeof payload.geom === 'string') {
      result.geom = payload.geom.trim();
      if (!result.geom.startsWith('POINT') && !result.geom.startsWith('LINESTRING') && !result.geom.startsWith('POLYGON')) {
        throw new Error('[ApiService] El campo geom debe ser WKT válido (POINT, LINESTRING o POLYGON).');
      }
    } else {
      throw new Error('[ApiService] El campo geom es obligatorio y debe ser WKT.');
    }

    const optionalFields = [
      'codigo_autogenerado', 'apellido_paterno', 'apellido_materno', 'nombre_completo',
      'fecha_nacimiento', 'sexo', 'celular_participante', 'tipo_productor',
      'actividad_agraria', 'tipo_cultivo', 'variedad', 'regimen_tenencia',
      'superficie_midagri', 'oficina_zonal', 'ubigeo', 'departamento', 'provincia',
      'distrito', 'caserio', 'centroide', 'area_ha', 'perimetro_m', 'altitud',
      'fuente', 'datum', 'observaciones',
      'profesional_dni', 'profesional_nombres', 'profesional_apellidos',
      'profesional_celular', 'profesional_email', 'ruta_dni_anverso', 'ruta_dni_reverso',
      'ruta_foto1', 'ruta_foto2', 'ruta_foto3', 'ruta_foto4', 'ruta_foto5', 'ruta_foto6',
      'device_uuid', 'fecha_captura', 'fecha_creacion', 'fecha_actualizacion', 'eliminado'
    ];

    for (const field of optionalFields) {
      const value = payload[field];
      if (value !== null && value !== undefined && value !== '') {
        if (field === 'superficie_midagri' && typeof value === 'string') {
          const num = Number(value);
          if (Number.isFinite(num)) {
            result[field] = num;
          }
        } else if (field === 'variedad') {
          if (typeof value !== 'string' || value.trim().length > 2) {
            throw new Error('[ApiService] El campo variedad admite como máximo 2 caracteres.');
          }
          result[field] = value.trim();
        } else if (field === 'fecha_captura' || field === 'fecha_creacion' || field === 'fecha_actualizacion') {
          if (typeof value === 'string') {
            result[field] = this.normalizarFechaISO(value);
          }
        } else {
          result[field] = value;
        }
      }
    }

    return toBackendJson(result);
  }

  private normalizarFechaISO(value: string): string {
    if (/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(value) && /Z|[+-][0-9]{2}:[0-9]{2}$/.test(value)) {
      return value;
    }

    const timestamp = Date.parse(value);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const offset = new Date().getTimezoneOffset();
      const sign = offset > 0 ? '-' : '+';
      const absOffset = Math.abs(offset);
      const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const minutes = String(absOffset % 60).padStart(2, '0');
      return `${date.toISOString().slice(0, 19)}${sign}${hours}:${minutes}`;
    }

    return value;
  }
}

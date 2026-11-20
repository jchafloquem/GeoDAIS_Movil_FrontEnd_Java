import { LocalRegisterProperties, RegistroParcelaApiPayload } from '../interfaces/register-data.interfaces';
import { ParcelGeometry, geometryCentroidWkt, geometryToWktZ } from '../services/parcel-geometry';

export function toRegistroParcelaApiPayload(
  properties: Partial<LocalRegisterProperties>,
  geometry: ParcelGeometry,
  now: Date = new Date()
): RegistroParcelaApiPayload {
  const fechaCaptura = toIsoTimestamp(properties.FECHA_CREACION_REGISTRO);
  const fechaCreacion = fechaCaptura || now.toISOString();

  return {
    internal_key: properties.INTERNAL_KEY || properties.internal_key || '',
    codigo_autogenerado: optionalText(properties.CODIGO_AUTOGENERADO_MIDAGRI),
    dni_productor: properties.DNI || '',
    nombres: properties.NOMBRES || '',
    apellido_paterno: optionalText(properties.APELLIDO_PATERNO),
    apellido_materno: optionalText(properties.APELLIDO_MATERNO),
    nombre_completo: optionalText(properties.NOMBRE_COMPLETO),
    fecha_nacimiento: optionalText(properties.FECHA_NACIMIENTO?.substring(0, 10)),
    sexo: normalizeSexo(properties.SEXO),
    celular_participante: normalizeCelular(properties.CELULAR_PARTICIPANTE),
    tipo_productor: optionalText(properties.TIPO_PRODUCTOR),
    actividad_agraria: optionalText(properties.ACTIVIDAD_AGRARIA),
    tipo_cultivo: optionalText(properties.TIPO_CULTIVO),
    variedad: optionalText(properties.VARIEDAD),
    regimen_tenencia: optionalText(properties.REGIMEN_TENENCIA),
    superficie_midagri: parsePositiveNumeric(properties.SUPERFICIE_MIDAGRI),
    oficina_zonal: optionalText(properties.UBIGEO_OFICINA_ZONAL),
    ubigeo: normalizeUbigeo(properties.UBIGEO_DISTRITO),
    departamento: optionalText(properties.TXT_DEPARTAMENTO || properties.MIDAGRI_DEPARTAMENTO),
    provincia: optionalText(properties.TXT_PROVINCIA || properties.MIDAGRI_PROVINCIA),
    distrito: optionalText(properties.TXT_DISTRITO || properties.MIDAGRI_DISTRITO),
    caserio: optionalText(properties.CASERIO || properties.UBIGEO_CASERIO),
    geom: geometryToWktZ(geometry, parseNumeric(properties.altitud) ?? 0),
    centroide: geometryCentroidWkt(geometry),
    area_ha: parseNumeric(properties.area),
    perimetro_m: parseNumeric(properties.perimetro),
    altitud: parseNumeric(properties.altitud),
    fuente: optionalText(properties.FUENTE),
    datum: optionalText(properties.DATUM) || 'WGS84',
    observaciones: optionalText(properties.OBSERVACIONES),
    profesional_dni: properties.PROFESIONAL_DNI || '',
    profesional_nombres: optionalText(properties.PROFESIONAL_NOMBRES),
    profesional_apellidos: optionalText(
      `${properties.PROFESIONAL_APELLIDO_PATERNO || ''} ${properties.PROFESIONAL_APELLIDO_MATERNO || ''}`.trim()
    ),
    profesional_celular: optionalText(properties.PROFESIONAL_CELULAR),
    profesional_email: optionalText(properties.PROFESIONAL_EMAIL),
    ruta_dni_anverso: optionalText(properties.RUTA_DNI_FRONT_API || properties.RUTA_DNI_FRONT),
    ruta_dni_reverso: optionalText(properties.RUTA_DNI_BACK_API || properties.RUTA_DNI_BACK),
    ruta_foto1: optionalText(properties.RUTA_FOTOS_API?.[0] || properties.RUTA_FOTOS?.[0]),
    ruta_foto2: optionalText(properties.RUTA_FOTOS_API?.[1] || properties.RUTA_FOTOS?.[1]),
    ruta_foto3: optionalText(properties.RUTA_FOTOS_API?.[2] || properties.RUTA_FOTOS?.[2]),
    ruta_foto4: optionalText(properties.RUTA_FOTOS_API?.[3] || properties.RUTA_FOTOS?.[3]),
    ruta_foto5: optionalText(properties.RUTA_FOTOS_API?.[4] || properties.RUTA_FOTOS?.[4]),
    ruta_foto6: optionalText(properties.RUTA_FOTOS_API?.[5] || properties.RUTA_FOTOS?.[5]),
    device_uuid: optionalText(properties.DEVICE_UUID),
    fecha_captura: fechaCaptura,
    fecha_creacion: fechaCreacion,
    fecha_actualizacion: toIsoTimestamp(properties.FECHA_ACTUALIZACION_REGISTRO) || fechaCreacion,
    eliminado: properties.ELIMINADO ?? false
  };
}

function parsePositiveNumeric(value: string | number | null | undefined): number | null {
  const number = parseNumeric(value);
  return number !== null && number > 0 ? number : null;
}

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text || null;
}

function normalizeUbigeo(value: string | null | undefined): string | null {
  const ubigeo = value?.trim();
  return ubigeo && /^\d{6}$/.test(ubigeo) ? ubigeo : null;
}

function normalizeSexo(value: string | null | undefined): 'M' | 'F' | null {
  const sexo = value?.trim().toUpperCase();
  if (!sexo) return null;
  if (sexo === 'M' || sexo.startsWith('MASCULINO')) return 'M';
  if (sexo === 'F' || sexo.startsWith('FEMENINO')) return 'F';
  return null;
}

function normalizeCelular(value: string | null | undefined): string | null {
  const celular = value?.trim();
  return celular && /^9\d{8}$/.test(celular) ? celular : null;
}

function toIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

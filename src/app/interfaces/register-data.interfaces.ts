export interface ValidationResult {
  isValid: boolean;
  missing: string[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Partial<LocalRegisterProperties>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

/** API request shape; property names and types follow registros_parcela. */
export interface RegistroParcelaApiPayload {
  internal_key: string;
  codigo_autogenerado?: string | null;
  dni_productor: string;
  nombres: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  nombre_completo?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: 'M' | 'F' | null;
  celular_participante?: string | null;
  tipo_productor?: string | null;
  actividad_agraria?: string | null;
  tipo_cultivo?: string | null;
  variedad?: string | null;
  regimen_tenencia?: string | null;
  superficie_midagri?: number | null;
  oficina_zonal?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  caserio?: string | null;
  geom: string;
  centroide?: string | null;
  area_ha?: number | null;
  perimetro_m?: number | null;
  altitud?: number | null;
  fuente?: string | null;
  datum: string;
  observaciones?: string | null;
  profesional_dni: string;
  profesional_nombres?: string | null;
  profesional_apellidos?: string | null;
  profesional_celular?: string | null;
  profesional_email?: string | null;
  ruta_dni_anverso?: string | null;
  ruta_dni_reverso?: string | null;
  ruta_foto1?: string | null;
  ruta_foto2?: string | null;
  ruta_foto3?: string | null;
  ruta_foto4?: string | null;
  ruta_foto5?: string | null;
  ruta_foto6?: string | null;
  device_uuid?: string | null;
  fecha_captura?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  eliminado: boolean;
}

/** Registro devuelto por GET /api/parcelas y GET /api/parcelas/{internalKey}. */
export interface RegistroParcelaApiRecord {
  internalKey: string;
  codigoAutogenerado?: string | null;
  dniProductor: string;
  nParcela?: string | null;
  nombres: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  nombreCompleto?: string | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  celularParticipante?: string | null;
  tipoProductor?: string | null;
  actividadAgraria?: string | null;
  tipoCultivo?: string | null;
  variedad?: string | null;
  regimenTenencia?: string | null;
  superficieMidagri?: number | null;
  oficinaZonal?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  caserio?: string | null;
  geom: string;
  centroide?: string | null;
  areaHa?: number | null;
  perimetroM?: number | null;
  altitud?: number | null;
  fuente?: string | null;
  datum: string;
  observaciones?: string | null;
  profesionalDni: string;
  profesionalNombres?: string | null;
  profesionalApellidos?: string | null;
  profesionalCelular?: string | null;
  profesionalEmail?: string | null;
  rutaDniAnverso?: string | null;
  rutaDniReverso?: string | null;
  rutaFoto1?: string | null;
  rutaFoto2?: string | null;
  rutaFoto3?: string | null;
  rutaFoto4?: string | null;
  rutaFoto5?: string | null;
  rutaFoto6?: string | null;
  deviceUuid?: string | null;
  fechaCaptura?: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  eliminado: boolean;
}

export interface RegistroParcelaApiPage {
  success: boolean;
  data: RegistroParcelaApiRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/** Legacy local GeoJSON/form shape persisted on the device. */
export interface LocalRegisterProperties {
  INTERNAL_KEY?: string;
  internal_key?: string;
  FECHA_CREACION_REGISTRO?: string;
  FECHA_ACTUALIZACION_REGISTRO?: string;
  ELIMINADO?: boolean;
  CASERIO?: string;
  DNI: string;
  NOMBRES: string;
  APELLIDO_PATERNO: string;
  APELLIDO_MATERNO: string;
  NOMBRE_COMPLETO: string;
  FECHA_NACIMIENTO: string;
  CELULAR_PARTICIPANTE: string;
  TIPO_PRODUCTOR: string;
  TIPO_CULTIVO: string;
  VARIEDAD?: string;
  OBSERVACIONES: string;
  CODIGO_AUTOGENERADO_MIDAGRI: string;
  FECHA_REGISTRO_MIDAGRI: string;
  ACTIVIDAD_AGRARIA: string;
  SUPERFICIE_MIDAGRI: string | null;
  REGIMEN_TENENCIA: string;
  SEXO: string;
  TXT_DEPARTAMENTO: string;
  TXT_PROVINCIA: string;
  TXT_DISTRITO: string;
  MIDAGRI_DEPARTAMENTO: string;
  MIDAGRI_PROVINCIA: string;
  MIDAGRI_DISTRITO: string;
  UBIGEO_OFICINA_ZONAL: string;
  UBIGEO_DEPARTAMENTO: string;
  UBIGEO_PROVINCIA: string;
  UBIGEO_DISTRITO: string;
  UBIGEO_CASERIO: string;
  PROFESIONAL_DNI: string;
  PROFESIONAL_NOMBRES: string;
  PROFESIONAL_APELLIDO_PATERNO: string;
  PROFESIONAL_APELLIDO_MATERNO: string;
  PROFESIONAL_CELULAR: string;
  PROFESIONAL_EMAIL: string;
  FUENTE: string;
  DATUM: string;
  DEVICE_UUID: string;
  RUTA_FOTOS: string[];
  RUTA_DNI_FRONT: string;
  RUTA_DNI_BACK: string;
  status?: 'draft' | 'pending';
  syncStatus?: 'pending';
  perimetro?: string;
  area?: string;
  altitud?: string;
  centroide?: string;
  geometryTypeLabel?: string;
  uploaded?: boolean;
}

export interface SavedRecordSummary {
  key: string;
  name: string;
  type: string;
  icon: string;
  createdAt: string;
  thumbnail?: string;
  statusColor: 'danger' | 'warning' | 'success';
  uploaded?: boolean;
}


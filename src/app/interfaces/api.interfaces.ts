export interface ReniecResponse {
  first_name: string;
  first_last_name: string;
  second_last_name: string;
  birthday?: string;
  sex?: string;
}

export interface ParticipanteResponse {
  dni: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
}

export interface PersonaIdentityResult {
  data: ReniecResponse;
  source: 'Participantes' | 'RENIEC';
}

export interface MidagriProductor {
  [key: string]: unknown;
  txt_codigoautogenerado?: string;
  fec_registro?: string;
  txt_actagraria?: string;
  num_superficie?: string;
  txt_regtenencia?: string;
  txt_sexo?: string;
  txt_departamento?: string;
  txt_provincia?: string;
  txt_distrito?: string;
}

export interface MidagriApiResponse {
  result: unknown;
  targetUrl: string | null;
  success: boolean;
  error: unknown;
  unAuthorizedRequest: boolean;
}

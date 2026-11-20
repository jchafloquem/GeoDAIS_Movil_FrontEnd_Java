import {
  ApiService,
  assertBackendPhotoReferences,
  getPhotoUploadUrl,
  normalizePhotoReference,
  toBackendJson
} from './api.service';

describe('toBackendJson', () => {
  it('converts table field names to the Java DTO properties without dropping values', () => {
    const payload = toBackendJson({
      internal_key: 'local-key',
      dni_productor: '12345678',
      profesional_dni: '87654321',
      centroide: 'POINT (0.5 0.5)',
      area_ha: 1.25,
      perimetro_m: 125.5,
      altitud: 500,
      variedad: '01'
    });

    expect(payload).toEqual({
      internalKey: 'local-key',
      dniProductor: '12345678',
      profesionalDni: '87654321',
      centroide: 'POINT (0.5 0.5)',
      areaHa: 1.25,
      perimetroM: 125.5,
      altitud: 500,
      variedad: '01'
    });
  });
});

describe('ApiService participant identity lookup', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService();
  });

  it('uses the participant record, including date of birth, without calling RENIEC', async () => {
    spyOn(apiService, 'getParticipanteData').and.returnValue(Promise.resolve({
      dni: '12345678',
      nombres: 'Ana María',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'García',
      fechaNacimiento: '1985-06-15',
      sexo: 'F'
    }));
    const reniecSpy = spyOn(apiService, 'getReniecData');

    const result = await apiService.getParticipanteOrReniecData('12345678');

    expect(apiService.getParticipanteData).toHaveBeenCalledWith('12345678');
    expect(result).toEqual({
      data: {
        first_name: 'Ana María',
        first_last_name: 'Pérez',
        second_last_name: 'García',
        birthday: '1985-06-15',
        sex: 'F'
      },
      source: 'Participantes'
    });
    expect(reniecSpy).not.toHaveBeenCalled();
  });

  it('falls back to RENIEC when no participant matches the DNI', async () => {
    spyOn(apiService, 'getParticipanteData').and.returnValue(Promise.resolve(null));
    const reniecData = {
      first_name: 'Luis',
      first_last_name: 'López',
      second_last_name: 'Díaz'
    };
    const reniecSpy = spyOn(apiService, 'getReniecData').and.returnValue(Promise.resolve(reniecData));

    const result = await apiService.getParticipanteOrReniecData('87654321');

    expect(apiService.getParticipanteData).toHaveBeenCalledWith('87654321');
    expect(reniecSpy).toHaveBeenCalledWith('87654321');
    expect(result).toEqual({ data: reniecData, source: 'RENIEC' });
  });
});

describe('ApiService photo upload', () => {
  it('rejects local device URIs from outgoing photo fields', () => {
    expect(() => assertBackendPhotoReferences({
      ruta_dni_reverso: 'file:///data/user/0/app/files/dni_back.jpeg'
    })).toThrowError(/referencia del backend/);
  });

  it('uses the photo endpoint under the configured backend context', () => {
    expect(getPhotoUploadUrl('http://192.168.26.16:8080'))
      .toBe('http://192.168.26.16:8080/geodaismovil/api/fotos');
    expect(getPhotoUploadUrl('https://sistemas.devida.gob.pe/geodaismovil/'))
      .toBe('https://sistemas.devida.gob.pe/geodaismovil/api/fotos');
  });

  it('normalizes the returned photo URL to the host used by the app', () => {
    const photoId = '550e8400-e29b-41d4-a716-446655440000';
    const uploadUrl = getPhotoUploadUrl('http://192.168.26.16:8080');
    const reference = normalizePhotoReference(
      `http://localhost:8080/geodaismovil/api/fotos/${photoId}`,
      uploadUrl
    );

    expect(reference).toBe(`http://192.168.26.16:8080/geodaismovil/api/fotos/${photoId}`);
  });
});

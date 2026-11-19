import { toBackendJson } from './api.service';

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

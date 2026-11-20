import { LocalRegisterProperties } from '../interfaces/register-data.interfaces';
import { ParcelGeometry } from '../services/parcel-geometry';
import { toRegistroParcelaApiPayload } from './registro-parcela.mapper';

describe('toRegistroParcelaApiPayload', () => {
  const geometry: ParcelGeometry = {
    type: 'Polygon',
    coordinates: [[[-77, -12], [-76.9, -12], [-76.9, -11.9], [-77, -11.9]]]
  };

  it('maps local fields to the complete API shape and normalizes constrained values', () => {
    const properties: Partial<LocalRegisterProperties> = {
      INTERNAL_KEY: 'local-key',
      DNI: '12345678',
      NOMBRES: 'ANA',
      SEXO: 'FEMENINO',
      CELULAR_PARTICIPANTE: '987654321',
      VARIEDAD: '01',
      SUPERFICIE_MIDAGRI: '2,5 ha',
      UBIGEO_DISTRITO: '120101',
      UBIGEO_CASERIO: 'SAN JUAN',
      RUTA_DNI_FRONT: 'dni-front.jpg',
      RUTA_DNI_BACK: 'dni-back.jpg',
      RUTA_FOTOS: ['photo-1.jpg', 'photo-2.jpg'],
      FECHA_CREACION_REGISTRO: '2026-11-03T15:00:00-05:00',
      FECHA_ACTUALIZACION_REGISTRO: '2026-11-03T15:30:00-05:00'
    };

    const payload = toRegistroParcelaApiPayload(properties, geometry, new Date('2026-11-03T20:00:00.000Z'));

    expect(Object.keys(payload).length).toBe(48);
    expect(payload.internal_key).toBe('local-key');
    expect(payload.sexo).toBe('F');
    expect(payload.celular_participante).toBe('987654321');
    expect(payload.variedad).toBe('01');
    expect(payload.superficie_midagri).toBe(2.5);
    expect(payload.ubigeo).toBe('120101');
    expect(payload.caserio).toBe('SAN JUAN');
    expect(payload.ruta_dni_anverso).toBe('dni-front.jpg');
    expect(payload.ruta_dni_reverso).toBe('dni-back.jpg');
    expect(payload.ruta_foto1).toBe('photo-1.jpg');
    expect(payload.ruta_foto2).toBe('photo-2.jpg');
    expect(payload.ruta_foto3).toBeNull();
    expect(payload.geom).toContain('POLYGON Z');
    expect(payload.centroide).toContain('POINT(');
    expect(payload.fecha_captura).toBe('2026-11-03T20:00:00.000Z');
    expect(payload.fecha_creacion).toBe('2026-11-03T20:00:00.000Z');
    expect(payload.fecha_actualizacion).toBe('2026-11-03T20:30:00.000Z');
  });

  it('uses null for values that do not satisfy database constraints', () => {
    const payload = toRegistroParcelaApiPayload({
      SEXO: 'NO ESPECIFICADO',
      CELULAR_PARTICIPANTE: 'NO TIENE',
      UBIGEO_DISTRITO: '123',
      SUPERFICIE_MIDAGRI: '0',
      FECHA_CREACION_REGISTRO: 'fecha invalida'
    }, geometry, new Date('2026-11-03T20:00:00.000Z'));

    expect(payload.sexo).toBeNull();
    expect(payload.celular_participante).toBeNull();
    expect(payload.ubigeo).toBeNull();
    expect(payload.superficie_midagri).toBeNull();
    expect(payload.fecha_captura).toBeNull();
    expect(payload.fecha_creacion).toBe('2026-11-03T20:00:00.000Z');
    expect(payload.fecha_actualizacion).toBe(payload.fecha_creacion);
  });

  it('uses backend photo URLs instead of local device file URIs', () => {
    const properties: Partial<LocalRegisterProperties> = {
      DNI: '12345678',
      NOMBRES: 'ANA',
      RUTA_DNI_FRONT: 'file:///data/user/0/app/files/dni_front.jpeg',
      RUTA_DNI_FRONT_API: 'https://api.example.test/geodaismovil/api/fotos/550e8400-e29b-41d4-a716-446655440000',
      RUTA_DNI_BACK: 'file:///data/user/0/app/files/dni_back.jpeg',
      RUTA_DNI_BACK_API: 'https://api.example.test/geodaismovil/api/fotos/550e8400-e29b-41d4-a716-446655440001',
      RUTA_FOTOS: ['file:///data/user/0/app/files/photo.jpeg'],
      RUTA_FOTOS_API: ['https://api.example.test/geodaismovil/api/fotos/550e8400-e29b-41d4-a716-446655440002']
    };

    const payload = toRegistroParcelaApiPayload(properties, geometry);

    expect(payload.ruta_dni_anverso).toBe(properties.RUTA_DNI_FRONT_API);
    expect(payload.ruta_dni_reverso).toBe(properties.RUTA_DNI_BACK_API);
    expect(payload.ruta_foto1).toBe(properties.RUTA_FOTOS_API?.[0]);
    expect(Object.values(payload).some(value => typeof value === 'string' && value.startsWith('file://'))).toBeFalse();
  });

  it('maps saved points and lines to the WKT expected by the backend', () => {
    const properties: Partial<LocalRegisterProperties> = {
      INTERNAL_KEY: 'point-key',
      DNI: '12345678',
      NOMBRES: 'ANA',
      PROFESIONAL_DNI: '87654321',
      altitud: '125'
    };

    const pointPayload = toRegistroParcelaApiPayload(
      properties,
      { type: 'Point', coordinates: [-77, -12] },
      new Date('2026-11-03T20:00:00.000Z')
    );
    const linePayload = toRegistroParcelaApiPayload(
      properties,
      { type: 'LineString', coordinates: [[-77, -12], [-76.9, -11.9, 130]] },
      new Date('2026-11-03T20:00:00.000Z')
    );

    expect(pointPayload.geom).toBe('POINT Z (-77 -12 125)');
    expect(pointPayload.centroide).toBe('POINT(-77 -12)');
    expect(linePayload.geom).toBe('LINESTRING Z (-77 -12 125, -76.9 -11.9 130)');
    expect(linePayload.centroide).toBeNull();
  });
});

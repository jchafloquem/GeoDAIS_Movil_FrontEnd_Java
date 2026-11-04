import { LocalRegisterProperties } from '../interfaces/register-data.interfaces';
import { PolygonGeometry } from '../services/parcel-geometry';
import { toRegistroParcelaApiPayload } from './registro-parcela.mapper';

describe('toRegistroParcelaApiPayload', () => {
  const geometry: PolygonGeometry = {
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

    expect(Object.keys(payload).length).toBe(47);
    expect(payload.internal_key).toBe('local-key');
    expect(payload.sexo).toBe('F');
    expect(payload.celular_participante).toBe('987654321');
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
      FECHA_CREACION_REGISTRO: 'fecha invalida'
    }, geometry, new Date('2026-11-03T20:00:00.000Z'));

    expect(payload.sexo).toBeNull();
    expect(payload.celular_participante).toBeNull();
    expect(payload.ubigeo).toBeNull();
    expect(payload.fecha_captura).toBeNull();
    expect(payload.fecha_creacion).toBe('2026-11-03T20:00:00.000Z');
    expect(payload.fecha_actualizacion).toBe(payload.fecha_creacion);
  });
});

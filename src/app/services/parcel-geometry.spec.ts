import { polygonCentroidWkt, polygonToWktZ } from './parcel-geometry';

describe('parcel geometry for the registration API', () => {
  it('creates a closed Polygon Z WKT with longitude, latitude and altitude', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [[[-77, -12], [-76.9, -12], [-76.9, -11.9], [-77, -11.9]]]
    };

    expect(polygonToWktZ(geometry, 125)).toBe(
      'POLYGON Z ((-77 -12 125, -76.9 -12 125, -76.9 -11.9 125, -77 -11.9 125, -77 -12 125))'
    );
    expect(polygonCentroidWkt(geometry)).toBe('POINT(-76.95 -11.95)');
  });

  it('preserves vertex Z values and polygon holes', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [
        [[0, 0, 5], [4, 0, 5], [4, 4, 5], [0, 4, 5], [0, 0, 5]],
        [[1, 1, 7], [1, 2, 7], [2, 2, 7], [2, 1, 7], [1, 1, 7]]
      ]
    };

    expect(polygonToWktZ(geometry)).toContain('POLYGON Z ((0 0 5');
    expect(polygonToWktZ(geometry)).toContain('(1 1 7');
    expect(polygonCentroidWkt(geometry)).toBe('POINT(2.0333333333 2.0333333333)');
  });

  it('rejects geometry types unsupported by the polygonz database column', () => {
    expect(() => polygonToWktZ({ type: 'MultiPolygon', coordinates: [] })).toThrowError(/solo acepta geometrías Polygon/);
  });

  it('rejects invalid coordinates instead of sending malformed WKT', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [[[181, -12, 0], [-76.9, -12, 0], [-76.9, -11.9, 0]]]
    };

    expect(() => polygonToWktZ(geometry)).toThrowError(/fuera de rango/);
  });
});

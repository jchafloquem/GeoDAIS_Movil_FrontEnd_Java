declare const describe: any;
declare const it: any;
declare const expect: any;

import { geometryCentroidWkt, geometryToWktZ } from './parcel-geometry';

describe('parcel geometry for the registration API', () => {
  it('creates a closed Polygon Z WKT with longitude, latitude and altitude', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [[[-77, -12], [-76.9, -12], [-76.9, -11.9], [-77, -11.9]]]
    };

    expect(geometryToWktZ(geometry, 125)).toBe(
      'POLYGON Z ((-77 -12 125, -76.9 -12 125, -76.9 -11.9 125, -77 -11.9 125, -77 -12 125))'
    );
    expect(geometryCentroidWkt(geometry)).toBe('POINT(-76.95 -11.95)');
  });

  it('preserves vertex Z values and polygon holes', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [
        [[0, 0, 5], [4, 0, 5], [4, 4, 5], [0, 4, 5], [0, 0, 5]],
        [[1, 1, 7], [1, 2, 7], [2, 2, 7], [2, 1, 7], [1, 1, 7]]
      ]
    };

    expect(geometryToWktZ(geometry)).toContain('POLYGON Z ((0 0 5');
    expect(geometryToWktZ(geometry)).toContain('(1 1 7');
    expect(geometryCentroidWkt(geometry)).toBe('POINT(2.0333333333 2.0333333333)');
  });

  it('creates Point Z WKT and a 2D point centroid', () => {
    const geometry = { type: 'Point', coordinates: [-77, -12] };

    expect(geometryToWktZ(geometry, 125)).toBe('POINT Z (-77 -12 125)');
    expect(geometryCentroidWkt(geometry)).toBe('POINT(-77 -12)');
  });

  it('creates LineString Z WKT without requiring a centroid', () => {
    const geometry = {
      type: 'LineString',
      coordinates: [[-77, -12], [-76.9, -11.9, 125]]
    };

    expect(geometryToWktZ(geometry, 100)).toBe('LINESTRING Z (-77 -12 100, -76.9 -11.9 125)');
    expect(geometryCentroidWkt(geometry)).toBeNull();
  });

  it('rejects geometry types unsupported by the database column', () => {
    expect(() => geometryToWktZ({ type: 'MultiPolygon', coordinates: [] }))
      .toThrowError(/POINT, LINESTRING o POLYGON/);
  });

  it('rejects invalid coordinates instead of sending malformed WKT', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [[[181, -12, 0], [-76.9, -12, 0], [-76.9, -11.9, 0]]]
    };

    expect(() => geometryToWktZ(geometry)).toThrowError(/fuera de rango/);
  });
});

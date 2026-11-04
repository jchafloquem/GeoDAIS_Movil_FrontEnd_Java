export interface PolygonGeometry {
  type: string;
  coordinates: unknown;
}

type Position = [number, number, number];

export function polygonToWktZ(geometry: PolygonGeometry, fallbackAltitude = 0): string {
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    throw new Error('El backend solo acepta geometrías Polygon para geom.');
  }

  const rings = geometry.coordinates.map((ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length < 3) {
      throw new Error(`El anillo ${ringIndex + 1} del polígono debe tener al menos 3 vértices.`);
    }

    const positions = ring.map((coordinate, coordinateIndex) =>
      toPosition(coordinate, fallbackAltitude, ringIndex, coordinateIndex)
    );
    const first = positions[0];
    const last = positions[positions.length - 1];
    if (!sameXY(first, last)) {
      positions.push([first[0], first[1], first[2]]);
    }
    if (new Set(positions.slice(0, -1).map(([longitude, latitude]) => `${longitude},${latitude}`)).size < 3) {
      throw new Error(`El anillo ${ringIndex + 1} del polígono debe tener al menos 3 vértices distintos.`);
    }

    return `(${positions.map(position => position.map(formatNumber).join(' ')).join(', ')})`;
  });

  return `POLYGON Z (${rings.join(', ')})`;
}

export function polygonCentroidWkt(geometry: PolygonGeometry): string {
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    throw new Error('No se puede calcular el centroide: se requiere una geometría Polygon.');
  }

  let weightedLongitude = 0;
  let weightedLatitude = 0;
  let totalArea = 0;

  geometry.coordinates.forEach((ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length < 3) {
      throw new Error(`El anillo ${ringIndex + 1} del polígono debe tener al menos 3 vértices.`);
    }
    const positions = ring.map((coordinate, coordinateIndex) =>
      toPosition(coordinate, 0, ringIndex, coordinateIndex)
    );
    const vertices = [...positions];
    if (sameXY(positions[0], positions[positions.length - 1])) {
      vertices.pop();
    }

    let crossSum = 0;
    let longitudeSum = 0;
    let latitudeSum = 0;
    for (let index = 0; index < vertices.length; index++) {
      const current = vertices[index];
      const next = vertices[(index + 1) % vertices.length];
      const cross = current[0] * next[1] - next[0] * current[1];
      crossSum += cross;
      longitudeSum += (current[0] + next[0]) * cross;
      latitudeSum += (current[1] + next[1]) * cross;
    }

    const ringArea = Math.abs(crossSum / 2);
    if (ringArea === 0) {
      throw new Error(`El anillo ${ringIndex + 1} del polígono tiene área cero.`);
    }
    const ringLongitude = longitudeSum / (3 * crossSum);
    const ringLatitude = latitudeSum / (3 * crossSum);
    const signedArea = ringIndex === 0 ? ringArea : -ringArea;
    weightedLongitude += ringLongitude * signedArea;
    weightedLatitude += ringLatitude * signedArea;
    totalArea += signedArea;
  });

  if (totalArea <= 0) {
    throw new Error('No se pudo calcular un centroide válido para el polígono.');
  }

  return `POINT(${formatNumber(weightedLongitude / totalArea)} ${formatNumber(weightedLatitude / totalArea)})`;
}

function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(10));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function toPosition(value: unknown, fallbackAltitude: number, ringIndex: number, coordinateIndex: number): Position {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error(`Coordenada inválida en el anillo ${ringIndex + 1}, vértice ${coordinateIndex + 1}.`);
  }

  const longitude = typeof value[0] === 'number' ? value[0] : Number.NaN;
  const latitude = typeof value[1] === 'number' ? value[1] : Number.NaN;
  const altitude = value.length > 2 && value[2] !== null && value[2] !== ''
    ? typeof value[2] === 'number' ? value[2] : Number.NaN
    : fallbackAltitude;

  if (
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(altitude)
  ) {
    throw new Error(`Coordenada fuera de rango en el anillo ${ringIndex + 1}, vértice ${coordinateIndex + 1}.`);
  }

  return [longitude, latitude, altitude];
}

function sameXY(first: Position, second: Position): boolean {
  return first[0] === second[0] && first[1] === second[1];
}

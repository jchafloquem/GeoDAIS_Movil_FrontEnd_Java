export interface ParcelGeometry {
  type: string;
  coordinates: unknown;
}

type Position = [number, number, number];

export function geometryToWktZ(geometry: ParcelGeometry, fallbackAltitude = 0): string {
  switch (geometry.type) {
    case 'Point': {
      const position = toPosition(geometry.coordinates, fallbackAltitude, 'el punto');
      return `POINT Z (${position.map(formatNumber).join(' ')})`;
    }
    case 'LineString': {
      const coordinates = asArray(geometry.coordinates, 'La línea');
      if (coordinates.length < 2) {
        throw new Error('La línea debe tener al menos 2 vértices.');
      }
      const positions = coordinates.map((coordinate, index) =>
        toPosition(coordinate, fallbackAltitude, `la línea, vértice ${index + 1}`)
      );
      return `LINESTRING Z (${positions.map(position => position.map(formatNumber).join(' ')).join(', ')})`;
    }
    case 'Polygon': {
      const rings = asArray(geometry.coordinates, 'El polígono');
      if (rings.length === 0) {
        throw new Error('El polígono debe tener al menos un anillo.');
      }
      const wktRings = rings.map((ring, ringIndex) => {
        const coordinates = asArray(ring, `El anillo ${ringIndex + 1}`);
        if (coordinates.length < 3) {
          throw new Error(`El anillo ${ringIndex + 1} del polígono debe tener al menos 3 vértices.`);
        }

        const positions = coordinates.map((coordinate, coordinateIndex) =>
          toPosition(coordinate, fallbackAltitude, `el anillo ${ringIndex + 1}, vértice ${coordinateIndex + 1}`)
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

      return `POLYGON Z (${wktRings.join(', ')})`;
    }
    default:
      throw new Error('El backend acepta geometrías POINT, LINESTRING o POLYGON para geom.');
  }
}

export function geometryCentroidWkt(geometry: ParcelGeometry): string | null {
  if (geometry.type === 'Point') {
    const position = toPosition(geometry.coordinates, 0, 'el punto');
    return `POINT(${formatNumber(position[0])} ${formatNumber(position[1])})`;
  }
  if (geometry.type === 'LineString') {
    return null;
  }
  if (geometry.type === 'Polygon') {
    return polygonCentroidWkt(geometry);
  }
  throw new Error('El backend acepta geometrías POINT, LINESTRING o POLYGON para geom.');
}

function polygonCentroidWkt(geometry: ParcelGeometry): string {
  const rings = asArray(geometry.coordinates, 'El polígono');
  if (rings.length === 0) {
    throw new Error('No se puede calcular el centroide: el polígono no tiene anillos.');
  }

  let weightedLongitude = 0;
  let weightedLatitude = 0;
  let totalArea = 0;

  rings.forEach((ring, ringIndex) => {
    const coordinates = asArray(ring, `El anillo ${ringIndex + 1}`);
    if (coordinates.length < 3) {
      throw new Error(`El anillo ${ringIndex + 1} del polígono debe tener al menos 3 vértices.`);
    }
    const positions = coordinates.map((coordinate, coordinateIndex) =>
      toPosition(coordinate, 0, `el anillo ${ringIndex + 1}, vértice ${coordinateIndex + 1}`)
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

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} contiene coordenadas inválidas.`);
  }
  return value;
}

function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(10));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function toPosition(value: unknown, fallbackAltitude: number, location: string): Position {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
    throw new Error(`Coordenada inválida en ${location}.`);
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
    throw new Error(`Coordenada fuera de rango en ${location}.`);
  }

  return [longitude, latitude, altitude];
}

function sameXY(first: Position, second: Position): boolean {
  return first[0] === second[0] && first[1] === second[1];
}

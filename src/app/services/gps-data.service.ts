import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface GpsData {
  lat: number | null;
  lng: number | null;
  alt: number | null;
  vel: number | null;
  accH: number | null;
  accV: number | null;
}

export interface GpsPositionSample {
  timestamp: number;
  coords: {
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy: number | null | undefined;
  };
}

export function isBetterHorizontalPosition(
  current: GpsPositionSample | null,
  candidate: GpsPositionSample
): boolean {
  return isValidGpsAccuracy(candidate.coords.accuracy) &&
    (current === null ||
      !isValidGpsAccuracy(current.coords.accuracy) ||
      candidate.coords.accuracy < current.coords.accuracy ||
      (candidate.coords.accuracy === current.coords.accuracy && candidate.timestamp > current.timestamp));
}

export function isBetterVerticalPosition(
  current: GpsPositionSample | null,
  candidate: GpsPositionSample
): boolean {
  const candidateAccuracy = candidate.coords.altitudeAccuracy;
  if (
    !isValidGpsAccuracy(candidateAccuracy) ||
    typeof candidate.coords.altitude !== 'number' ||
    !Number.isFinite(candidate.coords.altitude)
  ) {
    return false;
  }

  const currentAccuracy = current?.coords.altitudeAccuracy;
  return current === null ||
    !isValidGpsAccuracy(currentAccuracy) ||
    typeof current.coords.altitude !== 'number' ||
    !Number.isFinite(current.coords.altitude) ||
    candidateAccuracy < currentAccuracy ||
    (candidateAccuracy === currentAccuracy && candidate.timestamp > current.timestamp);
}

export const GPS_ACCURACY_THRESHOLDS = {
  high: 5,
  medium: 15,
  drawing: 10,
  photo: 15,
} as const;

export type GpsAccuracyQuality = 'good' | 'medium' | 'bad';

export function isValidGpsAccuracy(accuracy: number | null | undefined): accuracy is number {
  return typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0;
}

export function getGpsAccuracyQuality(accuracy: number | null): GpsAccuracyQuality {
  if (!isValidGpsAccuracy(accuracy) || accuracy > GPS_ACCURACY_THRESHOLDS.medium) {
    return 'bad';
  }
  return accuracy <= GPS_ACCURACY_THRESHOLDS.high ? 'good' : 'medium';
}

@Injectable({
  providedIn: 'root'
})
export class GpsDataService {
  private readonly initialGpsData: GpsData = {
    lat: null, lng: null, alt: null, vel: null, accH: null, accV: null,
  };

  private readonly gpsDataSource = new BehaviorSubject<GpsData>(this.initialGpsData);
  public currentGpsData = this.gpsDataSource.asObservable();

  updateGpsData(data: GpsData) {
    this.gpsDataSource.next(data);
  }
}

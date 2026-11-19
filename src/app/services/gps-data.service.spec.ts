import {
  GpsData,
  GpsDataService,
  getGpsAccuracyQuality,
  isBetterHorizontalPosition,
  isBetterVerticalPosition,
  isGpsCaptureAccurateEnough,
  isGpsPositionUsable,
  isReusableGpsPosition,
  isValidGpsAccuracy,
} from './gps-data.service';

describe('GpsDataService', () => {
  let service: GpsDataService;

  beforeEach(() => {
    service = new GpsDataService();
  });

  it('starts with an empty location snapshot', () => {
    let current: GpsData | undefined;
    const subscription = service.currentGpsData.subscribe(data => {
      current = data;
    });

    expect(current).toEqual({
      lat: null,
      lng: null,
      alt: null,
      vel: null,
      accH: null,
      accV: null,
    });
    subscription.unsubscribe();
  });

  it('publishes the latest location snapshot to subscribers', () => {
    const snapshots: GpsData[] = [];
    const subscription = service.currentGpsData.subscribe(data => snapshots.push(data));
    const nextPosition: GpsData = {
      lat: -12.0464,
      lng: -77.0428,
      alt: 154,
      vel: 1.2,
      accH: 4,
      accV: 7,
    };

    service.updateGpsData(nextPosition);

    expect(snapshots).toEqual([
      { lat: null, lng: null, alt: null, vel: null, accH: null, accV: null },
      nextPosition,
    ]);
    subscription.unsubscribe();
  });
});

describe('GPS accuracy', () => {
  it('accepts only finite, non-negative accuracy values', () => {
    expect(isValidGpsAccuracy(0)).toBeTrue();
    expect(isValidGpsAccuracy(3.5)).toBeTrue();
    expect(isValidGpsAccuracy(null)).toBeFalse();
    expect(isValidGpsAccuracy(Number.NaN)).toBeFalse();
    expect(isValidGpsAccuracy(Number.POSITIVE_INFINITY)).toBeFalse();
    expect(isValidGpsAccuracy(-1)).toBeFalse();
  });

  it('uses consistent quality boundaries', () => {
    expect(getGpsAccuracyQuality(5)).toBe('good');
    expect(getGpsAccuracyQuality(5.1)).toBe('medium');
    expect(getGpsAccuracyQuality(15)).toBe('medium');
    expect(getGpsAccuracyQuality(15.1)).toBe('bad');
    expect(getGpsAccuracyQuality(null)).toBe('bad');
    expect(getGpsAccuracyQuality(Number.NaN)).toBe('bad');
  });

  it('reuses only a fresh GPS position with photo-acceptable horizontal accuracy', () => {
    const position = {
      timestamp: 1000,
      coords: { accuracy: 10, altitudeAccuracy: 5 },
    };

    expect(isReusableGpsPosition(position, 2000, 1500)).toBeTrue();
    expect(isReusableGpsPosition(position, 2600, 1500)).toBeFalse();
    expect(isReusableGpsPosition({ ...position, timestamp: 2100 }, 2000, 1500)).toBeFalse();
    expect(isReusableGpsPosition({ ...position, coords: { ...position.coords, accuracy: 16 } }, 2000, 1500)).toBeFalse();
  });

  it('allows an early GPS capture when horizontal accuracy is high (vertical is desirable but not blocking)', () => {
    expect(isGpsCaptureAccurateEnough(5, 5)).toBeTrue();
    expect(isGpsCaptureAccurateEnough(4, null)).toBeTrue();
    expect(isGpsCaptureAccurateEnough(4, 5.1)).toBeTrue();
    expect(isGpsCaptureAccurateEnough(5.1, null)).toBeFalse();
    expect(isGpsCaptureAccurateEnough(null, 2)).toBeFalse();
  });

  it('accepts a position as usable when accuracy is within the acceptable threshold', () => {
    expect(isGpsPositionUsable(10)).toBeTrue();
    expect(isGpsPositionUsable(15)).toBeTrue();
    expect(isGpsPositionUsable(15.1)).toBeFalse();
    expect(isGpsPositionUsable(null)).toBeFalse();
  });

  it('selects the most accurate horizontal sample and prefers the newer sample on a tie', () => {
    const first = { timestamp: 100, coords: { accuracy: 9, altitudeAccuracy: null } };
    const better = { timestamp: 110, coords: { accuracy: 4, altitudeAccuracy: null } };
    const worse = { timestamp: 120, coords: { accuracy: 12, altitudeAccuracy: null } };
    const tie = { timestamp: 130, coords: { accuracy: 4, altitudeAccuracy: null } };

    expect(isBetterHorizontalPosition(null, first)).toBeTrue();
    expect(isBetterHorizontalPosition(first, better)).toBeTrue();
    expect(isBetterHorizontalPosition(first, worse)).toBeFalse();
    expect(isBetterHorizontalPosition(better, tie)).toBeTrue();
  });

  it('selects the most accurate vertical sample without inventing missing precision', () => {
    const first = { timestamp: 100, coords: { accuracy: 10, altitude: 100, altitudeAccuracy: 8 } };
    const better = { timestamp: 110, coords: { accuracy: 15, altitude: 101, altitudeAccuracy: 3 } };
    const missing = { timestamp: 120, coords: { accuracy: 2, altitude: null, altitudeAccuracy: 1 } };

    expect(isBetterVerticalPosition(null, first)).toBeTrue();
    expect(isBetterVerticalPosition(first, better)).toBeTrue();
    expect(isBetterVerticalPosition(better, missing)).toBeFalse();
  });
});

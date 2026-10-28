import {
  getGpsAccuracyQuality,
  isBetterHorizontalPosition,
  isBetterVerticalPosition,
  isValidGpsAccuracy,
} from './gps-data.service';

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

import { getGpsAccuracyQuality, isValidGpsAccuracy } from './gps-data.service';

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
});

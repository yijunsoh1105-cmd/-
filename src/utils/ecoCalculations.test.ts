import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURLY_CARBON_DATA, APPLIANCES } from '../data.js';
import {
  getCarbonThresholds,
  classifyCarbonIntensity,
  computeWindowAverages,
  findOptimalStartHour,
  calculateSavings,
  formatHourRange,
} from './ecoCalculations';

test('default data has 24 hourly entries with lower daytime and higher evening carbon intensity', () => {
  assert.equal(HOURLY_CARBON_DATA.length, 24);
  const noon = HOURLY_CARBON_DATA[12];
  const evening = HOURLY_CARBON_DATA[19];
  assert.ok(noon.carbonIntensity < 250);
  assert.ok(evening.carbonIntensity > 450);
  assert.ok(noon.renewableShare > evening.renewableShare);
});

test('thresholds classify default daytime as 좋음 and evening as 나쁨', () => {
  const thresholds = getCarbonThresholds(HOURLY_CARBON_DATA);
  assert.equal(thresholds.isAdaptive, false);
  assert.equal(classifyCarbonIntensity(HOURLY_CARBON_DATA[12].carbonIntensity, thresholds).level, 'good');
  assert.equal(classifyCarbonIntensity(HOURLY_CARBON_DATA[0].carbonIntensity, thresholds).level, 'moderate');
  assert.equal(classifyCarbonIntensity(HOURLY_CARBON_DATA[19].carbonIntensity, thresholds).level, 'bad');
});

test('adaptive thresholds split low-carbon datasets into green, yellow, and red', () => {
  const lowCarbonGrid = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    carbonIntensity: 50 + hour * 5,
    renewableShare: 60,
    price: 100,
  }));
  const thresholds = getCarbonThresholds(lowCarbonGrid);
  assert.equal(thresholds.isAdaptive, true);
  assert.equal(classifyCarbonIntensity(50, thresholds).level, 'good');
  assert.equal(classifyCarbonIntensity(110, thresholds).level, 'moderate');
  assert.equal(classifyCarbonIntensity(165, thresholds).level, 'bad');
});

test('computeWindowAverages handles fractional 1.5h dishwasher duration accurately', () => {
  const avg = computeWindowAverages(HOURLY_CARBON_DATA, 12, 1.5);
  const expectedCarbon = (HOURLY_CARBON_DATA[12].carbonIntensity * 1 + HOURLY_CARBON_DATA[13].carbonIntensity * 0.5) / 1.5;
  assert.ok(Math.abs(avg.avgCarbonIntensity - expectedCarbon) < 1e-6);
  assert.deepEqual(avg.coveredHours, [12, 13]);
});

test('computeWindowAverages wraps cleanly across midnight for 4h EV charging starting at 22:00', () => {
  const avg = computeWindowAverages(HOURLY_CARBON_DATA, 22, 4);
  const expectedCarbon =
    (HOURLY_CARBON_DATA[22].carbonIntensity +
      HOURLY_CARBON_DATA[23].carbonIntensity +
      HOURLY_CARBON_DATA[0].carbonIntensity +
      HOURLY_CARBON_DATA[1].carbonIntensity) /
    4;
  assert.ok(Math.abs(avg.avgCarbonIntensity - expectedCarbon) < 1e-6);
  assert.deepEqual(avg.coveredHours, [22, 23, 0, 1]);
});

test('findOptimalStartHour recommends midday solar hours for EV charger and dryer', () => {
  const dryer = APPLIANCES.find((a) => a.id === 'dryer')!;
  const ev = APPLIANCES.find((a) => a.id === 'ev-charger')!;

  const bestDryer = findOptimalStartHour(HOURLY_CARBON_DATA, dryer);
  assert.equal(bestDryer.startHour, 12);

  const bestEv = findOptimalStartHour(HOURLY_CARBON_DATA, ev);
  // Hours 11, 12, 13, 14 have average (204+182+188+212)/4 = 196.5
  assert.equal(bestEv.startHour, 11);
});

test('calculateSavings computes exact 1-time and 30-time CO2 and KRW savings', () => {
  const washer = APPLIANCES.find((a) => a.id === 'washer')!; // 0.5 kW, 1h
  const result = calculateSavings(HOURLY_CARBON_DATA, washer, 19);

  assert.equal(result.recommendedStartHour, 12);
  assert.equal(result.energyKwh, 0.5);

  const expectedCarbonSaved = 0.5 * (HOURLY_CARBON_DATA[19].carbonIntensity - HOURLY_CARBON_DATA[12].carbonIntensity);
  const expectedPriceSaved = 0.5 * (HOURLY_CARBON_DATA[19].price - HOURLY_CARBON_DATA[12].price);

  assert.ok(Math.abs(result.singleCarbonSavedG - expectedCarbonSaved) < 1e-6);
  assert.ok(Math.abs(result.monthlyCarbonSavedG - expectedCarbonSaved * 30) < 1e-6);
  assert.ok(Math.abs(result.singlePriceSavedWon - expectedPriceSaved) < 1e-6);
  assert.ok(Math.abs(result.monthlyPriceSavedWon - expectedPriceSaved * 30) < 1e-6);
  assert.equal(result.isAlreadyOptimal, false);
});

test('formatHourRange formats integer and half-hour durations cleanly', () => {
  assert.equal(formatHourRange(12, 1.5), '12:00 ~ 13:30');
  assert.equal(formatHourRange(22, 4), '22:00 ~ 02:00');
});

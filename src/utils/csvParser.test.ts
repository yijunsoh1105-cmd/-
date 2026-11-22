import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURLY_CARBON_DATA, SAMPLE_CSV_TEMPLATE } from '../data.js';
import { parseHourlyCsv } from './csvParser';

test('parses SAMPLE_CSV_TEMPLATE and calculates renewableShare directly', () => {
  const result = parseHourlyCsv(SAMPLE_CSV_TEMPLATE, HOURLY_CARBON_DATA);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.data.length, 24);
  // Hour 12 in SAMPLE_CSV_TEMPLATE: 35800 / 78500 = 45.605... -> 45.6%
  assert.equal(result.data[12].hour, 12);
  assert.equal(result.data[12].carbonIntensity, 175);
  assert.equal(result.data[12].renewableShare, 45.6);
  // Preserves fallback price
  assert.equal(result.data[12].price, HOURLY_CARBON_DATA[12].price);
});

test('parses headerless CSV with formatted hours like 00:00 or 1시', () => {
  const rows = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00,2500,10000,${300 + h}`);
  const result = parseHourlyCsv(rows.join('\n'), HOURLY_CARBON_DATA);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data[5].renewableShare, 25);
  assert.equal(result.data[5].carbonIntensity, 305);
});

test('rejects CSV missing hours or with renewableGen > totalGen', () => {
  const missingResult = parseHourlyCsv('시간,신재생 발전량,전체 발전량,탄소배출계수\n0,100,1000,300', HOURLY_CARBON_DATA);
  assert.equal(missingResult.ok, false);

  const invalidRows = ['시간,신재생 발전량,전체 발전량,탄소배출계수'];
  for (let h = 0; h < 24; h += 1) {
    invalidRows.push(`${h},${h === 3 ? 2000 : 200},1000,300`);
  }
  const invalidGenResult = parseHourlyCsv(invalidRows.join('\n'), HOURLY_CARBON_DATA);
  assert.equal(invalidGenResult.ok, false);
});

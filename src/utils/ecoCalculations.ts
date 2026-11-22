export interface HourlyCarbonEntry {
  hour: number;
  carbonIntensity: number;
  renewableShare: number;
  price: number;
  renewableGen?: number;
  totalGen?: number;
}

export interface DataSourceMeta {
  sourceName: string;
  referenceDate: string;
  isSample: boolean;
}

export interface ApplianceSpec {
  id: string;
  name: string;
  powerKw: number;
  durationHours: number;
  description: string;
}

export type EcoLevel = 'good' | 'moderate' | 'bad';

export interface CarbonThresholds {
  lowMax: number;
  highMin: number;
  isAdaptive: boolean;
}

export interface WindowAverages {
  avgCarbonIntensity: number;
  avgRenewableShare: number;
  avgPrice: number;
  coveredHours: number[];
}

export interface SavingsComparison {
  appliance: ApplianceSpec;
  originalStartHour: number;
  recommendedStartHour: number;
  originalWindow: WindowAverages;
  recommendedWindow: WindowAverages;
  energyKwh: number;
  singleCarbonSavedG: number;
  monthlyCarbonSavedG: number;
  singlePriceSavedWon: number;
  monthlyPriceSavedWon: number;
  isAlreadyOptimal: boolean;
}

const DEFAULT_LOW_MAX = 290;
const DEFAULT_HIGH_MIN = 430;

/**
 * Determine green / yellow / red thresholds.
 * Uses standard 290 / 430 gCO2/kWh cutoffs when the dataset spans them,
 * and falls back to dataset tertiles if an uploaded CSV sits entirely outside
 * those bounds so the 24-hour chart always provides meaningful differentiation.
 */
export function getCarbonThresholds(data: HourlyCarbonEntry[]): CarbonThresholds {
  if (data.length === 0) {
    return { lowMax: DEFAULT_LOW_MAX, highMin: DEFAULT_HIGH_MIN, isAdaptive: false };
  }

  const values = data.map((entry) => entry.carbonIntensity);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const spansStandard = minVal < DEFAULT_LOW_MAX && maxVal >= DEFAULT_HIGH_MIN;
  if (spansStandard) {
    return { lowMax: DEFAULT_LOW_MAX, highMin: DEFAULT_HIGH_MIN, isAdaptive: false };
  }

  const range = maxVal - minVal;
  if (range <= 0) {
    return { lowMax: minVal, highMin: maxVal + 1, isAdaptive: true };
  }

  return {
    lowMax: Math.round(minVal + range * 0.33),
    highMin: Math.round(minVal + range * 0.67),
    isAdaptive: true,
  };
}

export function classifyCarbonIntensity(
  intensity: number,
  thresholds: CarbonThresholds,
): { level: EcoLevel; label: '좋음' | '보통' | '나쁨' } {
  if (intensity <= thresholds.lowMax) {
    return { level: 'good', label: '좋음' };
  }
  if (intensity >= thresholds.highMin) {
    return { level: 'bad', label: '나쁨' };
  }
  return { level: 'moderate', label: '보통' };
}

/**
 * Compute time-weighted average carbon intensity, renewable share, and price
 * across a contiguous duration starting at `startHour` (wrapping at 24:00).
 * Supports fractional durations (e.g. 1.5 hours for a dishwasher).
 */
export function computeWindowAverages(
  data: HourlyCarbonEntry[],
  startHour: number,
  durationHours: number,
): WindowAverages {
  if (data.length !== 24) {
    throw new Error('24시간 데이터가 필요합니다.');
  }
  if (durationHours <= 0) {
    throw new Error('사용 시간은 0보다 커야 합니다.');
  }

  const normalizedStart = ((Math.floor(startHour) % 24) + 24) % 24;
  let remaining = durationHours;
  let offset = 0;
  let totalCarbon = 0;
  let totalRenewable = 0;
  let totalPrice = 0;
  const coveredHours: number[] = [];

  while (remaining > 1e-9) {
    const slotHour = (normalizedStart + offset) % 24;
    const slot = data[slotHour];
    const weight = Math.min(1, remaining);

    totalCarbon += slot.carbonIntensity * weight;
    totalRenewable += slot.renewableShare * weight;
    totalPrice += slot.price * weight;
    coveredHours.push(slotHour);

    remaining -= weight;
    offset += 1;
  }

  return {
    avgCarbonIntensity: totalCarbon / durationHours,
    avgRenewableShare: totalRenewable / durationHours,
    avgPrice: totalPrice / durationHours,
    coveredHours,
  };
}

/**
 * Find the contiguous start hour (0..23) minimizing average carbon intensity
 * over `appliance.durationHours`. Ties break by lower price, then earlier hour.
 */
export function findOptimalStartHour(
  data: HourlyCarbonEntry[],
  appliance: ApplianceSpec,
): { startHour: number; averages: WindowAverages } {
  let bestHour = 0;
  let bestAverages = computeWindowAverages(data, 0, appliance.durationHours);

  for (let hour = 1; hour < 24; hour += 1) {
    const candidate = computeWindowAverages(data, hour, appliance.durationHours);
    const carbonDiff = candidate.avgCarbonIntensity - bestAverages.avgCarbonIntensity;

    if (carbonDiff < -1e-6) {
      bestHour = hour;
      bestAverages = candidate;
    } else if (Math.abs(carbonDiff) <= 1e-6 && candidate.avgPrice < bestAverages.avgPrice - 1e-6) {
      bestHour = hour;
      bestAverages = candidate;
    }
  }

  return { startHour: bestHour, averages: bestAverages };
}

/**
 * Calculate single-use and monthly (30 uses) carbon (g) and electricity cost (KRW) savings.
 * Formula:
 * - 절감 탄소량(g) = 소비전력(kW) × 사용시간(h) × (원래 시간대 평균 배출계수 − 추천 시간대 평균 배출계수)
 * - 절감 요금(원) = 소비전력(kW) × 사용시간(h) × (원래 시간대 평균 요금 − 추천 시간대 평균 요금)
 */
export function calculateSavings(
  data: HourlyCarbonEntry[],
  appliance: ApplianceSpec,
  originalStartHour: number,
): SavingsComparison {
  const normalizedOriginal = ((Math.floor(originalStartHour) % 24) + 24) % 24;
  const originalWindow = computeWindowAverages(data, normalizedOriginal, appliance.durationHours);
  const optimal = findOptimalStartHour(data, appliance);

  const energyKwh = appliance.powerKw * appliance.durationHours;
  const singleCarbonSavedG =
    energyKwh * (originalWindow.avgCarbonIntensity - optimal.averages.avgCarbonIntensity);
  const singlePriceSavedWon =
    energyKwh * (originalWindow.avgPrice - optimal.averages.avgPrice);

  return {
    appliance,
    originalStartHour: normalizedOriginal,
    recommendedStartHour: optimal.startHour,
    originalWindow,
    recommendedWindow: optimal.averages,
    energyKwh,
    singleCarbonSavedG,
    monthlyCarbonSavedG: singleCarbonSavedG * 30,
    singlePriceSavedWon,
    monthlyPriceSavedWon: singlePriceSavedWon * 30,
    isAlreadyOptimal:
      normalizedOriginal === optimal.startHour || Math.abs(singleCarbonSavedG) < 0.05,
  };
}

export function formatHourLabel(hour: number): string {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  return `${String(normalized).padStart(2, '0')}:00`;
}

export function formatHourRange(startHour: number, durationHours: number): string {
  const startTotalMinutes = (((Math.floor(startHour) % 24) + 24) % 24) * 60;
  const endTotalMinutes = (startTotalMinutes + Math.round(durationHours * 60)) % (24 * 60);
  const startH = Math.floor(startTotalMinutes / 60);
  const startM = startTotalMinutes % 60;
  const endH = Math.floor(endTotalMinutes / 60);
  const endM = endTotalMinutes % 60;
  return `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} ~ ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function formatCarbonMass(grams: number): string {
  const rounded = Math.round(grams);
  if (Math.abs(rounded) >= 1000) {
    return `${(rounded / 1000).toFixed(2)} kg`;
  }
  return `${rounded.toLocaleString('ko-KR')} g`;
}

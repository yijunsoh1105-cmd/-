/**
 * 시간대별 친환경 전기 사용 알리미 - 기본 데이터 (data.js)
 *
 * 각 항목 구조:
 * - hour: 0 ~ 23 (시각)
 * - carbonIntensity: 탄소배출계수 (gCO2/kWh)
 * - renewableShare: 신재생에너지 발전 비중 (%)
 * - price: 시간대별 예상 전력요금 (원/kWh)
 *
 * 낮 시간대(10~15시)는 태양광 발전 증가로 탄소배출계수가 낮고,
 * 저녁 피크 시간대(18~21시)는 화력발전 비중 증가로 탄소배출계수가 높은 일간 패턴입니다.
 */

export const DATA_SOURCE_META = {
  sourceName: '샘플 데이터 (일간 전력계통 패턴 모델)',
  referenceDate: '2026-11-22',
  isSample: true,
};

export const HOURLY_CARBON_DATA = [
  { hour: 0, carbonIntensity: 365, renewableShare: 11.2, price: 112 },
  { hour: 1, carbonIntensity: 348, renewableShare: 11.8, price: 106 },
  { hour: 2, carbonIntensity: 336, renewableShare: 12.1, price: 102 },
  { hour: 3, carbonIntensity: 328, renewableShare: 12.4, price: 100 },
  { hour: 4, carbonIntensity: 334, renewableShare: 12.0, price: 104 },
  { hour: 5, carbonIntensity: 358, renewableShare: 11.4, price: 115 },
  { hour: 6, carbonIntensity: 392, renewableShare: 12.8, price: 132 },
  { hour: 7, carbonIntensity: 418, renewableShare: 15.6, price: 148 },
  { hour: 8, carbonIntensity: 382, renewableShare: 21.4, price: 158 },
  { hour: 9, carbonIntensity: 318, renewableShare: 28.9, price: 162 },
  { hour: 10, carbonIntensity: 242, renewableShare: 36.5, price: 148 },
  { hour: 11, carbonIntensity: 204, renewableShare: 41.8, price: 138 },
  { hour: 12, carbonIntensity: 182, renewableShare: 45.2, price: 128 },
  { hour: 13, carbonIntensity: 188, renewableShare: 44.1, price: 128 },
  { hour: 14, carbonIntensity: 212, renewableShare: 40.6, price: 135 },
  { hour: 15, carbonIntensity: 248, renewableShare: 35.2, price: 146 },
  { hour: 16, carbonIntensity: 326, renewableShare: 25.4, price: 166 },
  { hour: 17, carbonIntensity: 415, renewableShare: 16.2, price: 192 },
  { hour: 18, carbonIntensity: 488, renewableShare: 10.4, price: 218 },
  { hour: 19, carbonIntensity: 532, renewableShare: 8.1, price: 232 },
  { hour: 20, carbonIntensity: 518, renewableShare: 8.6, price: 226 },
  { hour: 21, carbonIntensity: 476, renewableShare: 9.8, price: 204 },
  { hour: 22, carbonIntensity: 418, renewableShare: 10.6, price: 156 },
  { hour: 23, carbonIntensity: 388, renewableShare: 11.0, price: 128 },
];

export const APPLIANCES = [
  {
    id: 'washer',
    name: '세탁기',
    powerKw: 0.5,
    durationHours: 1,
    description: '표준 세탁 1회',
  },
  {
    id: 'dryer',
    name: '건조기',
    powerKw: 2.5,
    durationHours: 1,
    description: '표준 건조 1회',
  },
  {
    id: 'dishwasher',
    name: '식기세척기',
    powerKw: 1.2,
    durationHours: 1.5,
    description: '고온 살균 코스',
  },
  {
    id: 'ev-charger',
    name: '전기차 충전',
    powerKw: 7,
    durationHours: 4,
    description: '완속 충전기 (7kW)',
  },
  {
    id: 'robot-vacuum',
    name: '로봇청소기',
    powerKw: 0.05,
    durationHours: 1,
    description: '자동 충전 1회',
  },
];

export const SAMPLE_CSV_TEMPLATE = [
  '시간,신재생 발전량,전체 발전량,탄소배출계수',
  '0,7200,62000,360',
  '1,7100,59000,342',
  '2,7000,57000,330',
  '3,6900,55500,324',
  '4,6800,56000,330',
  '5,7100,59500,354',
  '6,8600,64000,388',
  '7,11200,69500,412',
  '8,16200,73500,375',
  '9,22400,76000,310',
  '10,28500,77500,235',
  '11,33200,78200,196',
  '12,35800,78500,175',
  '13,34900,78400,182',
  '14,31600,77800,206',
  '15,27200,77200,242',
  '16,19800,78000,320',
  '17,13200,80500,408',
  '18,8600,82500,482',
  '19,6800,83500,526',
  '20,7100,82000,510',
  '21,7800,79000,470',
  '22,7900,73500,412',
  '23,7500,67000,382',
].join('\n');

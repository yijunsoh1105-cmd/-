import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import type {
  ApplianceSpec,
  SavingsComparison,
} from '../utils/ecoCalculations';
import {
  formatCarbonMass,
  formatHourLabel,
  formatHourRange,
} from '../utils/ecoCalculations';

interface ApplianceRecommenderProps {
  appliances: ApplianceSpec[];
  selectedApplianceId: string;
  onSelectAppliance: (id: string) => void;
  originalStartHour: number;
  onChangeOriginalStartHour: (hour: number) => void;
  savings: SavingsComparison;
}

export default function ApplianceRecommender({
  appliances,
  selectedApplianceId,
  onSelectAppliance,
  originalStartHour,
  onChangeOriginalStartHour,
  savings,
}: ApplianceRecommenderProps) {
  const [showFormula, setShowFormula] = useState(false);

  const singleCarbonRounded = Math.round(savings.singleCarbonSavedG);
  const monthlyCarbonRounded = Math.round(savings.monthlyCarbonSavedG);
  const singlePriceRounded = Math.round(savings.singlePriceSavedWon);
  const monthlyPriceRounded = Math.round(savings.monthlyPriceSavedWon);

  const isPriceSaved = singlePriceRounded >= 0;

  return (
    <div className="space-y-4">
      {/* Feature 2: Appliance & Original Time Recommendation */}
      <section
        aria-labelledby="appliance-section-heading"
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6"
      >
        <h2
          id="appliance-section-heading"
          className="text-lg font-bold text-slate-900 tracking-tight"
        >
          가전별 최적 시간 추천
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 mb-4">
          가전과 원래 사용 시간을 고르면 연속 사용 구간의 평균 탄소배출이 가장 적은 시작 시간을 찾아드립니다.
        </p>

        {/* Appliance list */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            1. 사용할 가전 선택
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {appliances.map((item) => {
              const isActive = item.id === selectedApplianceId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectAppliance(item.id)}
                  aria-pressed={isActive}
                  className={`min-h-[48px] w-full text-left px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    isActive
                      ? 'bg-emerald-50 border-emerald-600 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.description}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono-num">
                    <div className="text-xs font-bold text-slate-900">
                      {item.powerKw}kW
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {item.durationHours}시간
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Original start hour selector */}
        <div className="mb-5">
          <label
            htmlFor="original-hour-select"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            2. 원래 주로 쓰던 시작 시간
          </label>
          <select
            id="original-hour-select"
            value={originalStartHour}
            onChange={(e) => onChangeOriginalStartHour(Number(e.target.value))}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {formatHourLabel(hour)} 시작 ({formatHourRange(hour, savings.appliance.durationHours)})
              </option>
            ))}
          </select>
        </div>

        {/* Recommendation outcome */}
        <div
          data-testid="recommendation-result"
          className="rounded-xl bg-emerald-950 text-white p-4"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-emerald-200">
            <span>탄소배출 최소 추천 시간</span>
            <span className="font-mono-num">
              {savings.appliance.name} · {savings.appliance.durationHours}시간 연속
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight font-mono-num text-white">
              {formatHourLabel(savings.recommendedStartHour)} 시작
            </div>
            <div className="text-sm font-medium text-emerald-200 font-mono-num">
              {formatHourRange(
                savings.recommendedStartHour,
                savings.appliance.durationHours,
              )}
            </div>
          </div>

          {savings.isAlreadyOptimal ? (
            <p className="mt-2.5 text-xs sm:text-sm text-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>이미 탄소배출이 가장 적은 시간대를 선택하셨습니다.</span>
            </p>
          ) : (
            <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-emerald-300">원래 시간대 평균</div>
                <div className="font-mono-num text-sm font-semibold text-white mt-0.5 whitespace-nowrap">
                  {Math.round(savings.originalWindow.avgCarbonIntensity)} gCO₂/kWh
                </div>
                <div className="font-mono-num text-xs text-emerald-200 whitespace-nowrap">
                  {Math.round(savings.originalWindow.avgPrice)}원/kWh
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-300">추천 시간대 평균</div>
                <div className="font-mono-num text-sm font-semibold text-emerald-200 mt-0.5 whitespace-nowrap inline-flex items-center gap-1 justify-end">
                  <ArrowRight className="w-3.5 h-3.5 sm:hidden" aria-hidden="true" />
                  <span>{Math.round(savings.recommendedWindow.avgCarbonIntensity)} gCO₂/kWh</span>
                </div>
                <div className="font-mono-num text-xs text-emerald-200 whitespace-nowrap">
                  {Math.round(savings.recommendedWindow.avgPrice)}원/kWh
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature 3: Savings Effect Calculator */}
      <section
        aria-labelledby="savings-section-heading"
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6"
      >
        <h2
          id="savings-section-heading"
          className="text-lg font-bold text-slate-900 tracking-tight"
        >
          시간 이동 시 절감 효과
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 mb-4">
          {formatHourLabel(savings.originalStartHour)} 대신{' '}
          <strong className="text-slate-900 font-semibold">
            {formatHourLabel(savings.recommendedStartHour)}
          </strong>
          에 사용할 때 기대되는 절감량입니다.
        </p>

        {/* Big numbers grid: 1회 vs 한 달(30회) */}
        <div
          data-testid="savings-summary"
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
            <div className="text-xs font-medium text-emerald-900">1회 사용 탄소 절감</div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono-num mt-1 tracking-tight">
              {singleCarbonRounded > 0 ? formatCarbonMass(singleCarbonRounded) : '0 g'}
            </div>
            <div className="text-xs text-emerald-800 mt-1 font-mono-num">
              {isPriceSaved
                ? `요금 ${singlePriceRounded.toLocaleString('ko-KR')}원 절감`
                : `요금 ${Math.abs(singlePriceRounded).toLocaleString('ko-KR')}원 차이`}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
            <div className="text-xs font-medium text-slate-700">한 달 (30회) 탄소 절감</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono-num mt-1 tracking-tight">
              {monthlyCarbonRounded > 0 ? formatCarbonMass(monthlyCarbonRounded) : '0 g'}
            </div>
            <div className="text-xs text-slate-700 mt-1 font-mono-num">
              {isPriceSaved
                ? `요금 ${monthlyPriceRounded.toLocaleString('ko-KR')}원 절감`
                : `요금 ${Math.abs(monthlyPriceRounded).toLocaleString('ko-KR')}원 차이`}
            </div>
          </div>
        </div>

        {/* Collapsible calculation formula disclosure */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFormula((prev) => !prev)}
            aria-expanded={showFormula}
            aria-controls="calculation-formula-panel"
            className="w-full min-h-[44px] flex items-center justify-between text-sm font-semibold text-slate-700 hover:text-slate-900 px-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <span>계산 방법 보기</span>
            {showFormula ? (
              <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
            )}
          </button>

          {showFormula && (
            <div
              id="calculation-formula-panel"
              className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-2.5 leading-relaxed"
            >
              <div>
                <div className="font-semibold text-slate-900">1. 절감 탄소량 공식</div>
                <p className="mt-0.5 text-slate-700">
                  절감 탄소량(g) = 소비전력(kW) × 사용시간(h) × (원래 시간대 평균 배출계수 − 추천 시간대 평균 배출계수)
                </p>
                <p className="mt-1 font-mono-num text-slate-600">
                  = {savings.appliance.powerKw}kW × {savings.appliance.durationHours}h × (
                  {savings.originalWindow.avgCarbonIntensity.toFixed(1)} −{' '}
                  {savings.recommendedWindow.avgCarbonIntensity.toFixed(1)}) ={' '}
                  <strong className="text-slate-900">
                    {singleCarbonRounded.toLocaleString('ko-KR')} g
                  </strong>
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">2. 절감 요금 공식</div>
                <p className="mt-0.5 text-slate-700">
                  절감 요금(원) = 소비전력(kW) × 사용시간(h) × (원래 시간대 평균 요금 − 추천 시간대 평균 요금)
                </p>
                <p className="mt-1 font-mono-num text-slate-600">
                  = {savings.appliance.powerKw}kW × {savings.appliance.durationHours}h × (
                  {savings.originalWindow.avgPrice.toFixed(1)} −{' '}
                  {savings.recommendedWindow.avgPrice.toFixed(1)}) ={' '}
                  <strong className="text-slate-900">
                    {singlePriceRounded.toLocaleString('ko-KR')} 원
                  </strong>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 text-slate-600">
                한 달(30회) 기준 절감량은 1회 절감량에 30을 곱하여 산출합니다.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import type {
  CarbonThresholds,
  HourlyCarbonEntry,
  EcoLevel,
} from '../utils/ecoCalculations';
import {
  classifyCarbonIntensity,
  formatHourLabel,
} from '../utils/ecoCalculations';

interface EcoBarChartProps {
  data: HourlyCarbonEntry[];
  thresholds: CarbonThresholds;
  currentHour: number;
  selectedHour: number;
  onSelectHour: (hour: number) => void;
  recommendedHours: number[];
  originalHours: number[];
}

const BAR_COLORS: Record<
  EcoLevel,
  {
    fill: string;
    fillSelected: string;
    text: string;
    surface: string;
    border: string;
    dot: string;
  }
> = {
  good: {
    fill: 'bg-emerald-600 hover:bg-emerald-700',
    fillSelected: 'bg-emerald-700 ring-2 ring-slate-900 ring-offset-1',
    text: 'text-emerald-800',
    surface: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
  },
  moderate: {
    fill: 'bg-amber-400 hover:bg-amber-500',
    fillSelected: 'bg-amber-500 ring-2 ring-slate-900 ring-offset-1',
    text: 'text-amber-800',
    surface: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  bad: {
    fill: 'bg-red-500 hover:bg-red-600',
    fillSelected: 'bg-red-600 ring-2 ring-slate-900 ring-offset-1',
    text: 'text-red-800',
    surface: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
};

export default function EcoBarChart({
  data,
  thresholds,
  currentHour,
  selectedHour,
  onSelectHour,
  recommendedHours,
  originalHours,
}: EcoBarChartProps) {
  const maxIntensity = Math.max(
    100,
    ...data.map((entry) => entry.carbonIntensity),
  );
  // Add 10% headroom for visual breathing room above tallest bar
  const chartCeiling = Math.ceil((maxIntensity * 1.1) / 50) * 50;
  const midTick = Math.round(chartCeiling / 2);

  const activeEntry = data[selectedHour] ?? data[currentHour] ?? data[0];
  const activeStatus = classifyCarbonIntensity(
    activeEntry.carbonIntensity,
    thresholds,
  );
  const activeColors = BAR_COLORS[activeStatus.level];

  const recommendedSet = new Set(recommendedHours);
  const originalSet = new Set(originalHours);

  return (
    <section
      aria-labelledby="chart-section-heading"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
        <div>
          <h2
            id="chart-section-heading"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            24시간 탄소배출계수 그래프
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            막대를 누르면 시간대별 배출계수와 신재생 발전 비중을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" aria-hidden="true" />
            <span>좋음 (≤{thresholds.lowMax}g)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" aria-hidden="true" />
            <span>보통 ({thresholds.lowMax + 1}~{thresholds.highMin - 1}g)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-500 inline-block" aria-hidden="true" />
            <span>나쁨 (≥{thresholds.highMin}g)</span>
          </span>
        </div>
      </div>

      {/* Selected hour live inspector */}
      <div
        className={`rounded-xl border ${activeColors.border} ${activeColors.surface} px-3.5 py-2.5 mb-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="font-mono-num">{formatHourLabel(activeEntry.hour)}</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className={activeColors.text}>{activeStatus.label}</span>
            {activeEntry.hour === currentHour && (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-xs font-medium text-slate-700">현재 시각</span>
              </>
            )}
            {recommendedSet.has(activeEntry.hour) && (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-xs font-semibold text-emerald-700">추천 시간대</span>
              </>
            )}
          </div>
          <span className="text-xs text-slate-600 font-mono-num whitespace-nowrap">
            예상 요금 {activeEntry.price.toLocaleString('ko-KR')}원/kWh
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2 pt-2 border-t border-slate-900/10">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-600">탄소배출계수</div>
            <div className="text-sm sm:text-lg font-bold text-slate-900 font-mono-num">
              {activeEntry.carbonIntensity.toLocaleString('ko-KR')}{' '}
              <span className="text-[11px] sm:text-xs font-medium text-slate-600">g/kWh</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] sm:text-xs text-slate-600">신재생 비중</div>
            <div className="text-sm sm:text-lg font-bold text-slate-900 font-mono-num">
              {activeEntry.renewableShare.toFixed(1)}
              <span className="text-[11px] sm:text-xs font-medium text-slate-600">%</span>
            </div>
          </div>
          {activeEntry.renewableGen !== undefined && activeEntry.totalGen !== undefined ? (
            <div>
              <div className="text-[11px] sm:text-xs text-slate-600">신재생 / 전체</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-900 font-mono-num mt-0.5 truncate">
                {activeEntry.renewableGen.toLocaleString('ko-KR')} /{' '}
                {activeEntry.totalGen.toLocaleString('ko-KR')}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] sm:text-xs text-slate-600">전력 상태</div>
              <div className={`text-xs sm:text-sm font-semibold mt-0.5 ${activeColors.text}`}>
                {activeStatus.level === 'good'
                  ? '신재생 비중 높음'
                  : activeStatus.level === 'moderate'
                    ? '평균 배출 수준'
                    : '화력 의존 높음'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 24-hour Bar Chart */}
      <div className="relative" data-testid="eco-bar-chart">
        <div className="flex">
          {/* Y-axis scale */}
          <div
            aria-hidden="true"
            className="hidden sm:flex flex-col justify-between text-[11px] text-slate-400 font-mono-num pr-2.5 pb-7 h-52 select-none shrink-0"
          >
            <span>{chartCeiling}g</span>
            <span>{midTick}g</span>
            <span>0g</span>
          </div>

          {/* Bars + gridlines */}
          <div className="relative flex-1 min-w-0">
            {/* Horizontal reference lines */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-44 flex flex-col justify-between"
            >
              <div className="border-t border-dashed border-slate-200 w-full" />
              <div className="border-t border-dashed border-slate-200 w-full" />
              <div className="border-t border-slate-300 w-full" />
            </div>

            <div className="grid grid-cols-24 gap-0.5 sm:gap-1 items-end">
              {data.map((entry) => {
                const { level, label } = classifyCarbonIntensity(
                  entry.carbonIntensity,
                  thresholds,
                );
                const colors = BAR_COLORS[level];
                const heightPct = Math.max(
                  6,
                  Math.min(100, (entry.carbonIntensity / chartCeiling) * 100),
                );
                const isCurrent = entry.hour === currentHour;
                const isSelected = entry.hour === selectedHour;
                const isRecommended = recommendedSet.has(entry.hour);
                const isOriginal = originalSet.has(entry.hour);

                return (
                  <div key={entry.hour} className="flex flex-col items-center min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectHour(entry.hour)}
                      aria-label={`${entry.hour}시, 탄소배출계수 ${entry.carbonIntensity} gCO2/kWh, 상태 ${label}${isCurrent ? ', 현재 시각' : ''}${isRecommended ? ', 추천 시간대' : ''}`}
                      aria-pressed={isSelected}
                      className="group relative w-full h-44 flex flex-col justify-end items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-t"
                    >
                      {isCurrent && (
                        <span
                          className="mb-1 text-[10px] font-bold text-slate-900 whitespace-nowrap leading-none"
                          aria-hidden="true"
                        >
                          지금
                        </span>
                      )}
                      <div
                        className={`w-full rounded-t-sm transition-transform duration-150 ${
                          isSelected
                            ? `${colors.fillSelected} scale-y-[1.02]`
                            : `${colors.fill} opacity-90 group-hover:opacity-100`
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </button>

                    {/* Recommended / Original window indicator strip */}
                    <div className="w-full h-1.5 mt-1 flex items-center justify-center">
                      {isRecommended ? (
                        <span
                          className="w-full h-1 rounded-full bg-emerald-700"
                          title="추천 사용 시간"
                        />
                      ) : isOriginal ? (
                        <span
                          className="w-full h-1 rounded-full bg-slate-400"
                          title="원래 사용 시간"
                        />
                      ) : isCurrent ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-900"
                          title="현재 시각"
                        />
                      ) : null}
                    </div>

                    {/* X-axis tick labels every 3 hours on mobile, every 2 hours on sm+ */}
                    <span
                      className={`mt-1 text-[10px] font-mono-num leading-none ${
                        isCurrent || isSelected
                          ? 'font-bold text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      <span className="sm:hidden">
                        {entry.hour % 4 === 0 ? entry.hour : ''}
                      </span>
                      <span className="hidden sm:inline">
                        {entry.hour % 2 === 0 ? entry.hour : ''}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom indicator legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-emerald-700 inline-block" aria-hidden="true" />
              <span>추천 사용 시간대</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-slate-400 inline-block" aria-hidden="true" />
              <span>원래 사용 시간대</span>
            </span>
          </div>
          <span>가로축: 시각 (0~23시) · 세로축: gCO₂/kWh</span>
        </div>
      </div>
    </section>
  );
}

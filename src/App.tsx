import { useMemo, useState } from 'react';
import { Upload, Leaf } from 'lucide-react';
import {
  APPLIANCES,
  DATA_SOURCE_META,
  HOURLY_CARBON_DATA,
} from './data.js';
import type {
  ApplianceSpec,
  DataSourceMeta,
  HourlyCarbonEntry,
} from './utils/ecoCalculations';
import {
  calculateSavings,
  classifyCarbonIntensity,
  findOptimalStartHour,
  formatHourLabel,
  getCarbonThresholds,
} from './utils/ecoCalculations';
import EcoBarChart from './components/EcoBarChart';
import ApplianceRecommender from './components/ApplianceRecommender';
import CsvUploadModal from './components/CsvUploadModal';

const STATUS_HERO_STYLES = {
  good: {
    container: 'bg-emerald-50 border-emerald-200',
    verdictText: 'text-emerald-800',
    description: '태양광·신재생 발전 비중이 높아 가전을 사용하기 좋은 시간대입니다.',
  },
  moderate: {
    container: 'bg-amber-50 border-amber-200',
    verdictText: 'text-amber-800',
    description: '평균적인 탄소배출 수준입니다. 큰 전력 가전은 낮 시간대로 미루면 더 좋습니다.',
  },
  bad: {
    container: 'bg-red-50 border-red-200',
    verdictText: 'text-red-800',
    description: '화력발전 의존도가 높은 시간대입니다. 가전 사용을 미루는 것을 권장합니다.',
  },
};

export default function App() {
  const [hourlyData, setHourlyData] = useState<HourlyCarbonEntry[]>(
    HOURLY_CARBON_DATA as HourlyCarbonEntry[],
  );
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta>(
    DATA_SOURCE_META as DataSourceMeta,
  );

  const currentHour = new Date().getHours();
  const [selectedChartHour, setSelectedChartHour] = useState<number>(currentHour);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>(
    APPLIANCES[0].id,
  );
  const [originalStartHour, setOriginalStartHour] = useState<number>(19);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  const appliances = APPLIANCES as ApplianceSpec[];
  const selectedAppliance =
    appliances.find((item) => item.id === selectedApplianceId) ?? appliances[0];

  const thresholds = useMemo(
    () => getCarbonThresholds(hourlyData),
    [hourlyData],
  );

  const currentEntry = hourlyData[currentHour] ?? hourlyData[0];
  const currentClassification = classifyCarbonIntensity(
    currentEntry.carbonIntensity,
    thresholds,
  );
  const heroStyle = STATUS_HERO_STYLES[currentClassification.level];

  const bestSingleHour = useMemo(() => {
    const singleHourSpec: ApplianceSpec = {
      id: 'single',
      name: '1시간',
      powerKw: 1,
      durationHours: 1,
      description: '',
    };
    return findOptimalStartHour(hourlyData, singleHourSpec);
  }, [hourlyData]);

  const savings = useMemo(
    () => calculateSavings(hourlyData, selectedAppliance, originalStartHour),
    [hourlyData, selectedAppliance, originalStartHour],
  );

  const handleApplyCsvData = (
    nextData: HourlyCarbonEntry[],
    nextMeta: DataSourceMeta,
  ) => {
    setHourlyData(nextData);
    setSourceMeta(nextMeta);
  };

  const handleResetToSample = () => {
    setHourlyData(HOURLY_CARBON_DATA as HourlyCarbonEntry[]);
    setSourceMeta(DATA_SOURCE_META as DataSourceMeta);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8f6] text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                시간대별 친환경 전기 사용 알리미
              </h1>
            </div>
            <p
              data-testid="data-source-label"
              className="mt-0.5 text-xs sm:text-sm text-slate-600"
            >
              <span>데이터 출처: {sourceMeta.sourceName},</span>{' '}
              <span className="whitespace-nowrap">기준일: {sourceMeta.referenceDate}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>CSV 데이터 교체</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Left Column: Current Eco Status + 24-Hour Bar Chart */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {/* Current Status Banner */}
            <section
              aria-labelledby="current-status-heading"
              data-testid="current-status-banner"
              className={`rounded-2xl border p-4 sm:p-5 ${heroStyle.container}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-700">
                <span className="font-mono-num font-semibold whitespace-nowrap">
                  현재 시각 {formatHourLabel(currentHour)} 기준
                </span>
                <span className="font-mono-num whitespace-nowrap">
                  최적 시간: {formatHourLabel(bestSingleHour.startHour)} (
                  {Math.round(bestSingleHour.averages.avgCarbonIntensity)} gCO₂/kWh)
                </span>
              </div>

              <h2
                id="current-status-heading"
                className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                지금 전기를 쓰면{' '}
                <span className={heroStyle.verdictText}>
                  {currentClassification.label}
                </span>
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-slate-700">{heroStyle.description}</p>

              <div className="mt-3 pt-3 border-t border-slate-900/10 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-slate-600">현재 탄소배출</div>
                  <div className="text-base sm:text-xl font-bold text-slate-900 font-mono-num mt-0.5">
                    {currentEntry.carbonIntensity}{' '}
                    <span className="text-xs font-medium text-slate-600">g/kWh</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">신재생 비중</div>
                  <div className="text-base sm:text-xl font-bold text-slate-900 font-mono-num mt-0.5">
                    {currentEntry.renewableShare.toFixed(1)}
                    <span className="text-xs font-medium text-slate-600">%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">예상 요금</div>
                  <div className="text-base sm:text-xl font-bold text-slate-900 font-mono-num mt-0.5">
                    {currentEntry.price}
                    <span className="text-xs font-medium text-slate-600">원/kWh</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 24-Hour Carbon Intensity Bar Chart Component */}
            <EcoBarChart
              data={hourlyData}
              thresholds={thresholds}
              currentHour={currentHour}
              selectedHour={selectedChartHour}
              onSelectHour={setSelectedChartHour}
              recommendedHours={savings.recommendedWindow.coveredHours}
              originalHours={savings.originalWindow.coveredHours}
            />
          </div>

          {/* Right Column: Appliance Recommendation + Savings Calculator */}
          <div className="lg:col-span-5">
            <ApplianceRecommender
              appliances={appliances}
              selectedApplianceId={selectedAppliance.id}
              onSelectAppliance={setSelectedApplianceId}
              originalStartHour={originalStartHour}
              onChangeOriginalStartHour={setOriginalStartHour}
              savings={savings}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>평균 데이터 기반 추정치이며 실제 값과 다를 수 있음</p>
          <p className="font-mono-num">00:00 ~ 23:00 시간대별 친환경 전력 안내</p>
        </div>
      </footer>

      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        fallbackData={HOURLY_CARBON_DATA as HourlyCarbonEntry[]}
        currentMeta={sourceMeta}
        onApplyCsvData={handleApplyCsvData}
        onResetToSample={handleResetToSample}
      />
    </div>
  );
}

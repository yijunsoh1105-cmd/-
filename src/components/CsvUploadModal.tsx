import { useState, type ChangeEvent, type FormEvent } from 'react';
import { X, Upload, RotateCcw, Download } from 'lucide-react';
import type { DataSourceMeta, HourlyCarbonEntry } from '../utils/ecoCalculations';
import { parseHourlyCsv } from '../utils/csvParser';
import { SAMPLE_CSV_TEMPLATE } from '../data.js';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fallbackData: HourlyCarbonEntry[];
  currentMeta: DataSourceMeta;
  onApplyCsvData: (data: HourlyCarbonEntry[], meta: DataSourceMeta) => void;
  onResetToSample: () => void;
}

export default function CsvUploadModal({
  isOpen,
  onClose,
  fallbackData,
  currentMeta,
  onApplyCsvData,
  onResetToSample,
}: CsvUploadModalProps) {
  const [sourceName, setSourceName] = useState(
    currentMeta.isSample ? '전력거래소(KPX) 발전실적' : currentMeta.sourceName,
  );
  const [referenceDate, setReferenceDate] = useState(currentMeta.referenceDate);
  const [csvText, setCsvText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setErrorMessage(null);
    const content = await file.text();
    setCsvText(content);
  };

  const handleLoadSampleCsv = () => {
    setCsvText(SAMPLE_CSV_TEMPLATE);
    setSelectedFileName('sample_grid_data.csv');
    setErrorMessage(null);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_CSV_TEMPLATE], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eco_electricity_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedSource = sourceName.trim();
    const trimmedDate = referenceDate.trim();

    if (!trimmedSource) {
      setErrorMessage('데이터 출처명을 입력해 주세요.');
      return;
    }
    if (!trimmedDate) {
      setErrorMessage('기준일(날짜)을 입력해 주세요.');
      return;
    }

    const parsed = parseHourlyCsv(csvText, fallbackData);
    if (!parsed.ok) {
      setErrorMessage(parsed.error);
      return;
    }

    onApplyCsvData(parsed.data, {
      sourceName: trimmedSource,
      referenceDate: trimmedDate,
      isSample: false,
    });
    setErrorMessage(null);
    onClose();
  };

  const handleReset = () => {
    onResetToSample();
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="csv-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
            CSV 데이터로 교체하기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="CSV 업로드 창 닫기"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">CSV 열 형식 안내</div>
            <p>
              필수 열: <span className="font-mono-num font-semibold">[시간, 신재생 발전량, 전체 발전량, 탄소배출계수]</span>
            </p>
            <p className="text-slate-600">
              신재생 비중(%)은 업로드 시 (신재생 발전량 ÷ 전체 발전량) × 100으로 자동 계산됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="csv-source-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                데이터 출처명
              </label>
              <input
                id="csv-source-name"
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="예: 전력거래소(KPX)"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="csv-reference-date"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                기준일 (날짜)
              </label>
              <input
                id="csv-reference-date"
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* File upload & template actions */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>CSV 파일 선택</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadSampleCsv}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              예시 CSV 채우기
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-emerald-800 hover:bg-emerald-50 whitespace-nowrap"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>양식 다운로드</span>
            </button>
          </div>

          {selectedFileName && (
            <div className="text-xs text-slate-600">
              불러온 파일: <span className="font-medium text-slate-900">{selectedFileName}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="csv-textarea"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              CSV 데이터 내용 (0~23시, 24행)
            </label>
            <textarea
              id="csv-textarea"
              rows={7}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={'시간,신재생 발전량,전체 발전량,탄소배출계수\n0,7200,62000,360\n1,7100,59000,342\n...'}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs sm:text-sm text-red-800"
            >
              {errorMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {!currentMeta.isSample ? (
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>기본 데이터로 복원</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                취소
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                데이터 적용하기
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

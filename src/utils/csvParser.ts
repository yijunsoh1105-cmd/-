import type { HourlyCarbonEntry } from './ecoCalculations';

export type CsvParseResult =
  | { ok: true; data: HourlyCarbonEntry[] }
  | { ok: false; error: string };

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseHourCell(raw: string): number | null {
  const cleaned = raw.trim();
  if (/^\d{1,2}$/.test(cleaned)) {
    const num = Number(cleaned);
    return num >= 0 && num <= 23 ? num : null;
  }
  const timeMatch = cleaned.match(/^(\d{1,2})\s*(?::\d{2}|시)$/);
  if (timeMatch) {
    const num = Number(timeMatch[1]);
    return num >= 0 && num <= 23 ? num : null;
  }
  return null;
}

function parseNumberCell(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').replace(/%/g, '').trim();
  if (cleaned === '') {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse CSV with columns: [시간, 신재생 발전량, 전체 발전량, 탄소배출계수]
 * (optional 5th column: 요금/price).
 * Calculates renewableShare (%) = (신재생 발전량 / 전체 발전량) * 100 directly.
 */
export function parseHourlyCsv(
  csvText: string,
  fallbackData: HourlyCarbonEntry[],
): CsvParseResult {
  const normalizedText = csvText.replace(/^\uFEFF/, '').trim();
  if (!normalizedText) {
    return { ok: false, error: 'CSV 내용이 비어 있습니다.' };
  }

  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 24) {
    return {
      ok: false,
      error: `0시~23시까지 24개 시간대 행이 필요합니다. (현재 데이터 줄 수: ${lines.length}줄)`,
    };
  }

  const firstCells = splitCsvLine(lines[0]);
  const hasHeader = parseHourCell(firstCells[0]) === null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Determine column indices (default positional [시간, 신재생 발전량, 전체 발전량, 탄소배출계수])
  let hourIdx = 0;
  let renewableIdx = 1;
  let totalIdx = 2;
  let carbonIdx = 3;
  let priceIdx = -1;

  if (hasHeader) {
    const normalizedHeaders = firstCells.map((h) => h.replace(/\s+/g, '').toLowerCase());
    const foundHour = normalizedHeaders.findIndex((h) => h.includes('시간') || h === 'hour');
    const foundRenewable = normalizedHeaders.findIndex(
      (h) => h.includes('신재생발전량') || h.includes('신재생') || h.includes('renewable'),
    );
    const foundTotal = normalizedHeaders.findIndex(
      (h) => h.includes('전체발전량') || h.includes('총발전량') || h.includes('total'),
    );
    const foundCarbon = normalizedHeaders.findIndex(
      (h) => h.includes('탄소') || h.includes('배출계수') || h.includes('carbon'),
    );
    const foundPrice = normalizedHeaders.findIndex(
      (h) => h.includes('요금') || h.includes('단가') || h.includes('price'),
    );

    if (foundHour !== -1) hourIdx = foundHour;
    if (foundRenewable !== -1) renewableIdx = foundRenewable;
    if (foundTotal !== -1) totalIdx = foundTotal;
    if (foundCarbon !== -1) carbonIdx = foundCarbon;
    if (foundPrice !== -1) priceIdx = foundPrice;
  }

  const entriesByHour = new Map<number, HourlyCarbonEntry>();

  for (let i = 0; i < dataLines.length; i += 1) {
    const cells = splitCsvLine(dataLines[i]);
    const rowNumber = hasHeader ? i + 2 : i + 1;

    if (cells.length < 4) {
      return {
        ok: false,
        error: `${rowNumber}번째 줄의 열 개수가 부족합니다. [시간, 신재생 발전량, 전체 발전량, 탄소배출계수] 4개 열이 필요합니다.`,
      };
    }

    const hour = parseHourCell(cells[hourIdx] ?? '');
    if (hour === null) {
      return {
        ok: false,
        error: `${rowNumber}번째 줄의 시간 값("${cells[hourIdx] ?? ''}")이 올바르지 않습니다. 0~23 사이 값을 입력하세요.`,
      };
    }

    if (entriesByHour.has(hour)) {
      return {
        ok: false,
        error: `${hour}시 데이터가 중복되어 있습니다. 0시~23시 각 1개씩만 입력해 주세요.`,
      };
    }

    const renewableGen = parseNumberCell(cells[renewableIdx] ?? '');
    const totalGen = parseNumberCell(cells[totalIdx] ?? '');
    const carbonIntensity = parseNumberCell(cells[carbonIdx] ?? '');

    if (renewableGen === null || totalGen === null || carbonIntensity === null) {
      return {
        ok: false,
        error: `${rowNumber}번째 줄에 숫자가 아닌 값이 포함되어 있습니다.`,
      };
    }

    if (renewableGen < 0 || totalGen <= 0 || carbonIntensity < 0) {
      return {
        ok: false,
        error: `${rowNumber}번째 줄: 전체 발전량은 0보다 커야 하며, 발전량과 탄소배출계수는 음수일 수 없습니다.`,
      };
    }

    if (renewableGen > totalGen) {
      return {
        ok: false,
        error: `${rowNumber}번째 줄(${hour}시): 신재생 발전량(${renewableGen})이 전체 발전량(${totalGen})보다 클 수 없습니다.`,
      };
    }

    const renewableShare = Math.round((renewableGen / totalGen) * 1000) / 10;
    const optionalPrice = priceIdx !== -1 ? parseNumberCell(cells[priceIdx] ?? '') : null;
    const fallbackPrice = fallbackData[hour]?.price ?? 140;

    entriesByHour.set(hour, {
      hour,
      carbonIntensity: Math.round(carbonIntensity * 10) / 10,
      renewableShare,
      renewableGen,
      totalGen,
      price: optionalPrice !== null && optionalPrice >= 0 ? optionalPrice : fallbackPrice,
    });
  }

  if (entriesByHour.size !== 24) {
    const missing: number[] = [];
    for (let h = 0; h < 24; h += 1) {
      if (!entriesByHour.has(h)) missing.push(h);
    }
    return {
      ok: false,
      error: `누락된 시간대가 있습니다: ${missing.map((h) => `${h}시`).join(', ')}`,
    };
  }

  const sorted: HourlyCarbonEntry[] = [];
  for (let h = 0; h < 24; h += 1) {
    sorted.push(entriesByHour.get(h)!);
  }

  return { ok: true, data: sorted };
}

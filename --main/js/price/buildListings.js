import { PICORY_PRODUCT_MOCK } from '../products/mockData.js';

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 시세 목록 기준일(등록일 계산) — 실제 캘린더 기반 */
const LISTING_REF_DATE = new Date(2026, 3, 17);

function formatWon(n) {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

/**
 * mockData priceSummary에서 대표가(원) 추출 — "약 2,390,000원대" 등
 */
function parseMidFromSummary(priceSummary) {
  const m = String(priceSummary || '').match(/([\d,]+)\s*원/);
  if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  return 1200000;
}

function addDays(base, deltaDays) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function formatKoreanCalendarDate(d) {
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function platformMeta(key) {
  const map = {
    danggeun: { badgeClass: 'platform-badge--danggeun', label: '당근' },
    junggo: { badgeClass: 'platform-badge--junggo', label: '중고나라' },
    bunjang: { badgeClass: 'platform-badge--bunjang', label: '번개장터' },
    new: { badgeClass: 'platform-badge--new', label: '신품' },
  };
  return map[key] || map.danggeun;
}

/**
 * 플랫폼별 실제 검색·구매 목록 페이지 URL (해당 키워드로 열림)
 */
export function buildExternalListingUrl(platformKey, searchQuery) {
  const q = (searchQuery || '').trim() || 'Sony A7C II';
  const enc = encodeURIComponent(q);
  switch (platformKey) {
    case 'danggeun':
      return `https://www.daangn.com/search/${enc}`;
    case 'junggo':
      return `https://web.joongna.com/search/${enc}?excludeSold=true&excludeReservation=true`;
    case 'bunjang':
      return `https://m.bunjang.co.kr/search/products?q=${enc}&order=date`;
    case 'new':
      return `https://search.shopping.naver.com/search/all?query=${enc}`;
    default:
      return `https://www.daangn.com/search/${enc}`;
  }
}

function conditionMeta(key) {
  const map = {
    mint: { rowClass: 'condition--mint', label: '최상' },
    good: { rowClass: 'condition--good', label: '상급' },
    fair: { rowClass: 'condition--fair', label: '중급' },
    new: { rowClass: 'condition--new', label: '새제품' },
  };
  return map[key] || map.good;
}

/**
 * 상품 카탈로그 데이터로부터 시세 비교용 리스트 생성
 * 가격: 각 상품 priceSummary의 대표가를 반영한 중고·신품대
 * 등록일: 기준일 기준 실제 날짜(YYYY. M. D.)
 */
export function buildPriceListingsFromProducts() {
  const rows = [];

  PICORY_PRODUCT_MOCK.forEach((p) => {
    const fullName = `${p.brand} ${p.model}`.trim();
    const mid = parseMidFromSummary(p.priceSummary);
    const h = hashString(p.id);
    const baseUsed = Math.round(mid * 0.93);
    const baseNew = Math.round(mid * 1.14);

    const specs = [
      { platform: 'danggeun', condition: 'good', title: `${fullName} 급처 (박스 포함)`, offset: -88000, daysAgo: 1 },
      { platform: 'junggo', condition: 'mint', title: `${fullName} 신품급`, offset: 52000, daysAgo: 2 },
      { platform: 'bunjang', condition: 'mint', title: `${fullName} 바디 + 보증서`, offset: 165000, daysAgo: 3 },
      { platform: 'new', condition: 'new', title: `${fullName} 정식 수입 정품`, offset: 0, daysAgo: 0, isNew: true },
      { platform: 'danggeun', condition: 'fair', title: `${fullName} 중고 일괄`, offset: -198000, daysAgo: 9 },
    ];

    specs.forEach((spec, i) => {
      const jitter = ((h + i * 17) % 5) * 7000;
      const priceVal = spec.isNew
        ? Math.round(baseNew + jitter)
        : Math.round(baseUsed + spec.offset + jitter);

      const dateLabel = formatKoreanCalendarDate(addDays(LISTING_REF_DATE, -spec.daysAgo));
      const pf = platformMeta(spec.platform);
      const cd = conditionMeta(spec.condition);
      rows.push({
        productId: p.id,
        searchQuery: fullName,
        platformKey: spec.platform,
        platformLabel: pf.label,
        platformBadgeClass: pf.badgeClass,
        title: spec.title,
        conditionKey: spec.condition,
        conditionLabel: cd.label,
        conditionClass: cd.rowClass,
        price: formatWon(priceVal),
        priceValue: priceVal,
        date: dateLabel,
      });
    });
  });

  return rows;
}

/**
 * 검색어가 상품명·제목에 모두 포함되는지 (공백 단위 AND)
 */
export function filterListingsByQuery(listings, query) {
  const q = query.trim().toLowerCase();
  if (!q) return listings;
  const parts = q.split(/\s+/).filter(Boolean);
  return listings.filter((row) => {
    const hay = `${row.searchQuery} ${row.title}`.toLowerCase();
    return parts.every((w) => hay.includes(w));
  });
}

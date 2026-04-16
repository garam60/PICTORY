/**
 * 시세 비교 페이지 — URL ?q= 검색어 반영 및 목록 렌더
 */
import { escapeAttr, escapeHtml } from '../products/utils.js';
import {
  buildExternalListingUrl,
  buildPriceListingsFromProducts,
  filterListingsByQuery,
} from './buildListings.js';
import { chartInsightText, renderPriceChart } from './chart.js';

const DEFAULT_QUERY = 'Sony A7C II';

function parsePriceNumber(wonStr) {
  const n = parseInt(String(wonStr).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function renderListings(container, items, linkQuery) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="price-list__empty">검색 결과가 없습니다. 다른 모델명으로 검색해 보세요.</p>';
    return;
  }

  const q = (linkQuery && linkQuery.trim()) || '';

  container.innerHTML = items
    .map(
      (row) => {
        const href = buildExternalListingUrl(row.platformKey, q || row.searchQuery);
        return `
    <div class="price-list__item card">
      <span class="price-list__col price-list__col--platform"><span class="platform-badge ${row.platformBadgeClass}">${escapeHtml(row.platformLabel)}</span></span>
      <span class="price-list__col price-list__col--title">${escapeHtml(row.title)}</span>
      <span class="price-list__col price-list__col--condition"><span class="condition ${row.conditionClass}">${escapeHtml(row.conditionLabel)}</span></span>
      <span class="price-list__col price-list__col--price"><strong>${escapeHtml(row.price)}</strong></span>
      <span class="price-list__col price-list__col--date">${escapeHtml(row.date)}</span>
      <span class="price-list__col price-list__col--action"><a class="btn btn--outline btn--xs" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">보러가기</a></span>
    </div>
  `;
      },
    )
    .join('');
}

function updateSummary(summaryRoot, items) {
  if (!summaryRoot) return;

  const elNew = summaryRoot.querySelector('[data-price-summary="new"]');
  const elUsed = summaryRoot.querySelector('[data-price-summary="used"]');
  const elSave = summaryRoot.querySelector('[data-price-summary="save"]');
  const srcNew = summaryRoot.querySelector('[data-price-summary-src="new"]');
  const srcUsed = summaryRoot.querySelector('[data-price-summary-src="used"]');
  const srcSave = summaryRoot.querySelector('[data-price-summary-src="save"]');

  const nums = items.map((r) => parsePriceNumber(r.price)).filter((n) => n != null);
  if (!nums.length) {
    if (elNew) elNew.textContent = '—';
    if (elUsed) elUsed.textContent = '—';
    if (elSave) elSave.textContent = '—';
    if (srcNew) srcNew.textContent = '검색 결과가 없어요';
    if (srcUsed) srcUsed.textContent = '매물이 없습니다';
    if (srcSave) srcSave.textContent = '—';
    return;
  }

  const newPrices = items.filter((r) => r.conditionKey === 'new').map((r) => parsePriceNumber(r.price)).filter(Boolean);
  const usedPrices = items.filter((r) => r.conditionKey !== 'new').map((r) => parsePriceNumber(r.price)).filter(Boolean);

  const minNew = newPrices.length ? Math.min(...newPrices) : Math.min(...nums);
  const avgUsed = usedPrices.length ? Math.round(usedPrices.reduce((a, b) => a + b, 0) / usedPrices.length) : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  const save = Math.max(0, minNew - avgUsed);

  const fmt = (n) => `${n.toLocaleString('ko-KR')}<small>원</small>`;

  if (elNew) elNew.innerHTML = fmt(minNew);
  if (elUsed) elUsed.innerHTML = fmt(avgUsed);
  if (elSave) elSave.innerHTML = fmt(save);

  if (srcNew) srcNew.textContent = '검색된 목록 중 신품 최저';
  if (srcUsed) srcUsed.textContent = '검색된 중고 매물 평균';
  if (srcSave) srcSave.textContent = '위 두 값 기준 예상 차이';
}

function updateChartTitle(chartTitleEl, queryLabel) {
  if (!chartTitleEl) return;
  chartTitleEl.textContent = `${queryLabel} · 최근 7개월 중고 시세 추이`;
}

function applyFromUrl(allListings, input, listContainer, summaryRoot, chartTitleEl, chartContainer, insightTextEl) {
  const params = new URLSearchParams(window.location.search);
  const rawQ = params.get('q');
  const query = (rawQ != null && rawQ.trim() !== '' ? rawQ : DEFAULT_QUERY).trim();

  if (input) input.value = query;

  const filtered = filterListingsByQuery(allListings, query);
  renderListings(listContainer, filtered, query);
  updateSummary(summaryRoot, filtered);
  updateChartTitle(chartTitleEl, query);

  if (chartContainer) {
    const chartResult = renderPriceChart(chartContainer, filtered, query);
    if (insightTextEl) insightTextEl.textContent = chartInsightText(chartResult.values);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('priceSearchInput');
  const btn = document.getElementById('priceSearchBtn');
  const listContainer = document.getElementById('priceListResults');
  const summaryRoot = document.getElementById('priceSummary');
  const chartTitleEl = document.querySelector('.price-chart__title');
  const chartContainer = document.getElementById('chartContainer');
  const insightTextEl = document.getElementById('priceChartInsightText');

  if (!listContainer) return;

  const allListings = buildPriceListingsFromProducts();

  const run = () =>
    applyFromUrl(allListings, input, listContainer, summaryRoot, chartTitleEl, chartContainer, insightTextEl);
  run();

  function submitSearch() {
    const v = input?.value.trim() || '';
    const url = new URL(window.location.href);
    if (v) url.searchParams.set('q', v);
    else url.searchParams.delete('q');
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    run();
  }

  btn?.addEventListener('click', submitSearch);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSearch();
    }
  });

  window.addEventListener('popstate', run);
});

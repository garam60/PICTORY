/**
 * 최근 7개월 중고 평균 시세 라인 차트 (목록의 중고 평균에 맞춤)
 */
import { escapeAttr, escapeHtml } from '../products/utils.js';

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const W = 600;
const H = 200;
const PAD_T = 18;
const PAD_B = 22;
const X0 = 36;
const X1 = 564;
const N = 7;

/** 시세 목록·그래프 기준일 (buildListings.js LISTING_REF_DATE와 동일) */
const CHART_REF_DATE = new Date(2026, 3, 17);

function monthLabelsRolling7(reference = CHART_REF_DATE) {
  const labels = [];
  for (let i = N - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    labels.push(`${d.getMonth() + 1}월`);
  }
  return labels;
}

function fullMonthLabels(reference = CHART_REF_DATE) {
  const labels = [];
  for (let i = N - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}년 ${d.getMonth() + 1}월`);
  }
  return labels;
}

/**
 * 마지막 달 평균 = anchor, 이전 달은 약한 계절성·하락 추세(프로토타입)
 */
function buildMonthlyAverages(anchorAvg, query) {
  const seed = hashString(query || 'default');
  const wobble = (i) => 1 + (((seed >> (i * 3)) % 17) - 8) / 400;
  const trend = [1.052, 1.038, 1.022, 1.008, 0.995, 0.988, 1.0];
  const last = trend[N - 1];
  return trend.map((t, i) => Math.round((anchorAvg * t * wobble(i)) / last));
}

function fallbackAnchorAvg(query) {
  const h = hashString(query || 'Sony A7C II');
  return 2100000 + (h % 650000);
}

function formatWonFull(n) {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

function formatWonMan(n) {
  const man = n / 10000;
  if (man >= 100) return `${Math.round(man)}만`;
  if (man >= 10) return `${(Math.round(man * 10) / 10).toFixed(1)}만`;
  return `${Math.round(man * 10) / 10}만`;
}

function yTicks(minV, maxV, count) {
  const pad = Math.max((maxV - minV) * 0.06, 50000);
  let lo = minV - pad;
  let hi = maxV + pad;
  if (hi <= lo) hi = lo + 100000;
  const step = (hi - lo) / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i += 1) ticks.push(Math.round(lo + step * i));
  return { ticks, lo, hi };
}

function valueToY(v, lo, hi) {
  const t = (v - lo) / (hi - lo);
  return PAD_T + (1 - t) * (H - PAD_T - PAD_B);
}

function xAt(i) {
  return X0 + (i / (N - 1)) * (X1 - X0);
}

/**
 * @param {HTMLElement} mount - #chartContainer
 * @param {Array<{ conditionKey: string, priceValue: number }>} filteredListings
 * @param {string} query
 */
export function renderPriceChart(mount, filteredListings, query) {
  if (!mount) return { values: [], anchorAvg: 0 };

  const used = (filteredListings || []).filter((r) => r.conditionKey !== 'new');
  const anchorAvg = used.length
    ? Math.round(used.reduce((s, r) => s + r.priceValue, 0) / used.length)
    : fallbackAnchorAvg(query);

  const values = buildMonthlyAverages(anchorAvg, query);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const minIdx = values.indexOf(minV);
  const maxIdx = values.indexOf(maxV);

  const { ticks, lo, hi } = yTicks(minV, maxV, 5);
  const points = values.map((v, i) => ({ x: xAt(i), y: valueToY(v, lo, hi), v, i }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x} ${points[0].y} L${points.slice(1).map((p) => `${p.x} ${p.y}`).join(' ')} L${points[N - 1].x} ${H} L${points[0].x} ${H} Z`;

  const monthShort = monthLabelsRolling7();
  const monthFull = fullMonthLabels();
  const gradId = `chartGrad_${hashString(query + String(anchorAvg))}`;

  const yAxisHtml = ticks
    .slice()
    .reverse()
    .map((t) => `<span>${formatWonMan(t)}</span>`)
    .join('');

  const xAxisHtml = monthShort.map((lab) => `<span>${escapeHtml(lab)}</span>`).join('');

  const pointGroups = points
    .map((p) => {
      const isMin = p.i === minIdx;
      const isMax = p.i === maxIdx;
      let fill = '#FF5C00';
      let pointClass = 'chart__point';
      if (isMin && isMax) {
        pointClass += ' chart__point--both';
        fill = '#7C3AED';
      } else if (isMin) {
        pointClass += ' chart__point--min';
        fill = '#2563EB';
      } else if (isMax) {
        pointClass += ' chart__point--max';
        fill = '#DC2626';
      }

      let labelSvg = '';
      const labelY = p.y + 17;
      if (isMin && isMax) {
        labelSvg = `
      <text class="chart__point-label chart__point-label--both" text-anchor="middle" pointer-events="none">
        <tspan class="chart__point-label-line" x="${p.x}" y="${labelY}">최저가</tspan>
        <tspan class="chart__point-label-line" x="${p.x}" dy="11">최고가</tspan>
      </text>`;
      } else if (isMin) {
        labelSvg = `
      <text class="chart__point-label chart__point-label--min" x="${p.x}" y="${labelY}" text-anchor="middle" pointer-events="none">최저가</text>`;
      } else if (isMax) {
        labelSvg = `
      <text class="chart__point-label chart__point-label--max" x="${p.x}" y="${labelY}" text-anchor="middle" pointer-events="none">최고가</text>`;
      }

      return `
    <g class="${pointClass}" data-month="${escapeAttr(monthFull[p.i])}" data-avg="${escapeAttr(formatWonFull(p.v))}">
      <circle class="chart__hit" cx="${p.x}" cy="${p.y}" r="14" fill="transparent" style="cursor:pointer"/>
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="${fill}" stroke="#fff" stroke-width="1.2"/>
      ${labelSvg}
    </g>`;
    })
    .join('');

  mount.innerHTML = `
    <div class="chart">
      <div class="chart__y-axis" aria-hidden="true">${yAxisHtml}</div>
      <div class="chart__area chart__area--interactive">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="chart__svg" overflow="visible" focusable="false" aria-hidden="true" id="priceChartSvg">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FF5C00" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#FF5C00" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#${gradId})"/>
          <polyline points="${polyline}" fill="none" stroke="#FF5C00" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${pointGroups}
        </svg>
        <div class="chart__x-axis" aria-hidden="true">${xAxisHtml}</div>
        <div class="chart-tooltip" id="chartTooltip" role="tooltip" aria-hidden="true"></div>
      </div>
    </div>
  `;

  const svg = mount.querySelector('#priceChartSvg');
  const tooltip = mount.querySelector('#chartTooltip');
  const area = mount.querySelector('.chart__area--interactive');

  let lastTipKey = '';

  function showTip(textMonth, textAvg, clientX, clientY) {
    if (!tooltip || !area) return;
    const key = `${textMonth}|${textAvg}`;
    const contentChanged = key !== lastTipKey;
    lastTipKey = key;

    const html = `<span class="chart-tooltip__month">${escapeHtml(textMonth)}</span><span class="chart-tooltip__avg">평균 중고 시세 ${escapeHtml(textAvg)}</span>`;
    if (contentChanged) {
      tooltip.innerHTML = html;
      tooltip.classList.remove('chart-tooltip--visible');
    }
    tooltip.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      const rect = area.getBoundingClientRect();
      const tw = tooltip.offsetWidth;
      const th = tooltip.offsetHeight;
      let left = clientX - rect.left + 12;
      let top = clientY - rect.top - th - 12;
      if (left + tw > rect.width - 8) left = rect.width - tw - 8;
      if (left < 8) left = 8;
      if (top < 8) top = clientY - rect.top + 16;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;

      if (contentChanged) {
        requestAnimationFrame(() => {
          tooltip.classList.add('chart-tooltip--visible');
        });
      } else {
        tooltip.classList.add('chart-tooltip--visible');
      }
    });
  }

  function hideTip() {
    if (!tooltip) return;
    lastTipKey = '';
    tooltip.classList.remove('chart-tooltip--visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  mount.querySelectorAll('.chart__point').forEach((g) => {
    g.addEventListener('mouseenter', (e) => {
      showTip(g.dataset.month, g.dataset.avg, e.clientX, e.clientY);
    });
    g.addEventListener('mousemove', (e) => {
      showTip(g.dataset.month, g.dataset.avg, e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', hideTip);
  });

  svg?.addEventListener('mouseleave', hideTip);

  return { values, anchorAvg };
}

export function chartInsightText(values) {
  if (!values || values.length < 2) return '검색된 중고 시세 추이를 확인해 보세요.';
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const pct = first ? Math.round((delta / first) * 100) : 0;
  if (delta < -first * 0.02) return `최근 7개월간 평균 중고가 약 ${Math.abs(pct)}% 하락한 구간이에요. 매수 타이밍을 검토해 보기 좋습니다.`;
  if (delta > first * 0.02) return `최근 7개월간 평균 중고가 약 ${pct}% 상승했어요. 가격 변동을 감안해 보세요.`;
  return '최근 7개월간 평균 중고가가 비교적 안정적인 구간이에요.';
}

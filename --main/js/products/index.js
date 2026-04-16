/**
 * Picory 상품 페이지 엔트리 — 카테고리 / 목록 / 필터 연결
 */
import { PICORY_PRODUCT_CATEGORIES } from './categories.js';
import { PICORY_PRODUCT_MOCK } from './mockData.js';
import { filterProductsByCategory } from './filterProducts.js';
import { mountCategoryNav } from './categoryNav.js';
import { renderProductCardHTML, bindProductCardImageFallbacks } from './productCard.js';
import { sortProducts, isValidProductSort, getSortLabel } from './sortProducts.js';

const SORT_STORAGE_KEY = 'picory-product-sort';

const recommendIndexById = new Map(
  PICORY_PRODUCT_MOCK.map((p, i) => [p.id, i]),
);

function getStoredSort() {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw && isValidProductSort(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'recommend';
}

function setStoredSort(value) {
  try {
    if (isValidProductSort(value)) localStorage.setItem(SORT_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

function refreshProductGrid(gridRoot, emptyEl, categoryKey, sortKey) {
  const filtered = filterProductsByCategory(PICORY_PRODUCT_MOCK, categoryKey);
  const items = sortProducts(filtered, sortKey, recommendIndexById);
  if (!items.length) {
    gridRoot.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    window.syncPicoryBookmarks?.();
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  gridRoot.innerHTML = items.map(renderProductCardHTML).join('');
  bindProductCardImageFallbacks(gridRoot);
  window.syncPicoryBookmarks?.();
}

function getCategoryKeyFromHash() {
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  const key = decodeURIComponent(raw.split('&')[0]);
  return PICORY_PRODUCT_CATEGORIES.some((c) => c.key === key) ? key : null;
}

/**
 * 네이티브 select 대신 커스텀 드롭다운 (파란 시스템 하이라이트 제거)
 * @param {{ trigger: HTMLElement, list: HTMLElement, valueEl: HTMLElement, initialKey: string, onChange: (key: string) => void }} p
 */
function mountProductSortUi({ trigger, list, valueEl, initialKey, onChange }) {
  const optionEls = () => Array.from(list.querySelectorAll('.product-catalog__sort-option[data-value]'));

  function syncUi(key) {
    valueEl.textContent = getSortLabel(key);
    optionEls().forEach((opt) => {
      const v = opt.getAttribute('data-value');
      const sel = v === key;
      opt.setAttribute('aria-selected', sel ? 'true' : 'false');
      opt.classList.toggle('is-selected', sel);
    });
  }

  function setOpen(open) {
    list.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    trigger.classList.toggle('is-open', open);
  }

  function close() {
    setOpen(false);
  }

  syncUi(initialKey);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(list.hidden);
  });

  list.addEventListener('click', (e) => {
    const li = /** @type {HTMLElement | null} */ (e.target.closest('.product-catalog__sort-option[data-value]'));
    if (!li) return;
    const v = li.getAttribute('data-value');
    if (!v || !isValidProductSort(v)) return;
    syncUi(v);
    onChange(v);
    close();
  });

  document.addEventListener('mousedown', (e) => {
    if (list.hidden) return;
    const t = /** @type {Node | null} */ (e.target);
    if (trigger.contains(t) || list.contains(t)) return;
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault();
      close();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const navRoot = document.getElementById('productCategoryNav');
  const gridRoot = document.getElementById('productGrid');
  const emptyEl = document.getElementById('productCatalogEmpty');
  const sortTrigger = document.getElementById('productSortTrigger');
  const sortList = document.getElementById('productSortList');
  const sortValue = document.getElementById('productSortValue');

  if (!navRoot || !gridRoot) return;

  let sortKey = getStoredSort();

  const hashKey = getCategoryKeyFromHash();
  const initialKey = hashKey || PICORY_PRODUCT_CATEGORIES[0].key;

  const nav = mountCategoryNav(navRoot, PICORY_PRODUCT_CATEGORIES, {
    initialKey,
    onChange: (key) => {
      refreshProductGrid(gridRoot, emptyEl, key, sortKey);
      history.replaceState(null, '', `#${encodeURIComponent(key)}`);
    },
  });

  if (sortTrigger && sortList && sortValue) {
    mountProductSortUi({
      trigger: sortTrigger,
      list: sortList,
      valueEl: sortValue,
      initialKey: sortKey,
      onChange: (v) => {
        sortKey = v;
        setStoredSort(v);
        refreshProductGrid(gridRoot, emptyEl, nav.getActiveKey(), sortKey);
      },
    });
  }

  refreshProductGrid(gridRoot, emptyEl, initialKey, sortKey);

  if (hashKey) {
    requestAnimationFrame(() => {
      document.getElementById('product-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
});

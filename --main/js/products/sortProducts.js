/**
 * 상품 목록 정렬 (추천순 = mockData 배열 순서)
 */
export const PRODUCT_SORT_KEYS = Object.freeze([
  'recommend',
  'popular',
  'price-desc',
  'price-asc',
]);

/** @type {{ value: (typeof PRODUCT_SORT_KEYS)[number], label: string }[]} */
export const PRODUCT_SORT_OPTIONS = Object.freeze([
  { value: 'recommend', label: '추천순' },
  { value: 'popular', label: '인기순' },
  { value: 'price-desc', label: '가격높은순' },
  { value: 'price-asc', label: '가격낮은순' },
]);

/** @param {string} value */
export function isValidProductSort(value) {
  return PRODUCT_SORT_KEYS.includes(/** @type {(typeof PRODUCT_SORT_KEYS)[number]} */ (value));
}

/** @param {string} key */
export function getSortLabel(key) {
  const found = PRODUCT_SORT_OPTIONS.find((o) => o.value === key);
  return found ? found.label : PRODUCT_SORT_OPTIONS[0].label;
}

/**
 * @param {Array<{ id: string, popularity?: number, priceKrw?: number }>} items
 * @param {(typeof PRODUCT_SORT_KEYS)[number]} sortKey
 * @param {Map<string, number>} recommendIndexById
 */
export function sortProducts(items, sortKey, recommendIndexById) {
  const list = [...items];
  switch (sortKey) {
    case 'popular':
      return list.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case 'price-desc':
      return list.sort((a, b) => (b.priceKrw ?? 0) - (a.priceKrw ?? 0));
    case 'price-asc':
      return list.sort((a, b) => (a.priceKrw ?? 0) - (b.priceKrw ?? 0));
    case 'recommend':
    default:
      return list.sort(
        (a, b) =>
          (recommendIndexById.get(a.id) ?? 999) - (recommendIndexById.get(b.id) ?? 999),
      );
  }
}

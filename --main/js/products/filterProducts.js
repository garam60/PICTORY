/**
 * 선택된 카테고리 key 기준 상품 필터링
 */
export function filterProductsByCategory(products, categoryKey) {
  if (!categoryKey) return products;
  return products.filter((product) => Array.isArray(product.categories) && product.categories.includes(categoryKey));
}

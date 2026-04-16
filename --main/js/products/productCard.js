import { escapeHtml, escapeAttr } from './utils.js';

/** 썸네일 로드 실패 시 (images/cameras = 사이트 루트 기준 public 동일) */
export const CAMERA_THUMB_FALLBACK = 'images/cameras/default-camera.png';

/**
 * 단일 상품 카드 마크업
 */
export function renderProductCardHTML(product) {
  const thumb = product.thumbnail || CAMERA_THUMB_FALLBACK;
  const alt = `${product.brand || ''} ${product.model || ''}`.trim();
  const searchQ = `${product.brand || ''} ${product.model || ''}`.trim();
  const priceHref = `price.html?q=${encodeURIComponent(searchQ)}`;
  return `
    <div class="product-card product-item" data-product-id="${escapeAttr(product.id)}">
      <button type="button" class="bookmark-add product-card__bookmark" aria-label="북마크 추가">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </button>
      <a class="product-card__link" href="${escapeAttr(priceHref)}">
        <div class="product-card__thumb">
          <img
            class="product-card__img"
            src="${escapeAttr(thumb)}"
            alt="${escapeAttr(alt)}"
            loading="lazy"
            decoding="async"
            data-fallback="${escapeAttr(CAMERA_THUMB_FALLBACK)}"
          >
        </div>
        <span class="product-card__brand">${escapeHtml(product.brand)}</span>
        <h3 class="product-card__model">${escapeHtml(product.model)}</h3>
        <p class="product-card__desc">${escapeHtml(product.description)}</p>
        <strong class="product-card__price">${escapeHtml(product.priceSummary)}</strong>
        <p class="product-card__platform">${escapeHtml(product.platform)}</p>
      </a>
    </div>
  `.trim();
}

/**
 * 그리드에 삽입된 카드 이미지에 onerror fallback 바인딩
 */
export function bindProductCardImageFallbacks(root) {
  if (!root) return;
  root.querySelectorAll('.product-card__img').forEach((img) => {
    const fallback = img.getAttribute('data-fallback') || CAMERA_THUMB_FALLBACK;
    const fallbackName = fallback.split('/').pop() || '';
    img.addEventListener('error', function onThumbError() {
      img.removeEventListener('error', onThumbError);
      if (fallbackName && img.src.includes(fallbackName)) return;
      img.removeAttribute('srcset');
      img.src = fallback;
    });
  });
}

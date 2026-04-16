/**
 * AI 추천 카드 표시명 → 카탈로그 썸네일 경로 (로컬 images/cameras)
 */
import { PICORY_PRODUCT_MOCK } from '../products/mockData.js';

/** 카탈로그에 없는 모델은 비슷한 라인업 또는 기본 이미지 */
const EXTRA_THUMBNAILS = {
  'Fujifilm X-T5': 'images/cameras/fujifilm-x-s20.png',
};

export function getThumbnailForRecommendModel(displayName) {
  const n = (displayName || '').trim();
  if (EXTRA_THUMBNAILS[n]) return EXTRA_THUMBNAILS[n];

  const hit = PICORY_PRODUCT_MOCK.find(
    (p) => `${p.brand} ${p.model}` === n || p.model === n,
  );
  if (hit?.thumbnail) return hit.thumbnail;

  return 'images/cameras/default-camera.png';
}

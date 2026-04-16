/**
 * recommend.html에서 app.js보다 먼저 로드 — 썸네일 헬퍼를 전역에 노출
 */
import { getThumbnailForRecommendModel } from './cameraThumbnails.js';

window.picoryGetRecommendThumbnail = getThumbnailForRecommendModel;

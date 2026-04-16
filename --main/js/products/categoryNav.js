import { escapeHtml, escapeAttr } from './utils.js';

/**
 * 상단 고정 카테고리 네비게이션 마운트
 * @param {HTMLElement} root
 * @param {{ key: string, label: string }[]} categories
 * @param {{ initialKey?: string, onChange: (key: string) => void }} options
 */
export function mountCategoryNav(root, categories, options) {
  const { onChange, initialKey } = options;
  let activeKey = initialKey && categories.some((c) => c.key === initialKey) ? initialKey : categories[0].key;

  root.innerHTML = categories
    .map((cat) => {
      const active = cat.key === activeKey ? ' filter-chip--active' : '';
      const pressed = cat.key === activeKey ? 'true' : 'false';
      return `<button type="button" class="filter-chip product-catalog-nav__chip${active}" data-key="${escapeAttr(cat.key)}" aria-pressed="${pressed}">${escapeHtml(cat.label)}</button>`;
    })
    .join('');

  root.querySelectorAll('button[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (!key || key === activeKey) return;
      activeKey = key;
      root.querySelectorAll('button[data-key]').forEach((b) => {
        const on = b.getAttribute('data-key') === activeKey;
        b.classList.toggle('filter-chip--active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      onChange(activeKey);
    });
  });

  return {
    getActiveKey: () => activeKey,
  };
}

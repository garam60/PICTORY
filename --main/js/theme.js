/**
 * 라이트 / 다크(블랙) 테마 — 하단 푸터 버튼, localStorage 유지
 */
(function picoryTheme() {
  const STORAGE_KEY = 'picory-theme';

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (_) {
      /* ignore */
    }
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const mode = btn.getAttribute('data-theme-toggle');
      const active = (isDark && mode === 'dark') || (!isDark && mode === 'light');
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function init() {
    let t = 'light';
    try {
      t = localStorage.getItem(STORAGE_KEY) || 'light';
    } catch (_) {
      /* ignore */
    }
    if (t !== 'light' && t !== 'dark') t = 'light';
    applyTheme(t);

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(btn.getAttribute('data-theme-toggle'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('[data-mypage-tab]');
  const panels = document.querySelectorAll('[data-mypage-panel]');
  const logoutBtn = document.getElementById('mypageLogoutBtn');
  const sessionStorageKey = 'picoryAuthSession';
  const activityLogStorageKey = 'picoryActivityLogs';
  const nicknameEl = document.getElementById('mypageNickname');
  const timelineEl = document.getElementById('mypageTimeline');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.mypageTab;
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      panels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.mypagePanel === target);
      });
    });
  });

  const sessionRaw = localStorage.getItem(sessionStorageKey);
  if (nicknameEl && sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      if (session.nickname) nicknameEl.textContent = session.nickname;
    } catch (error) {
      /* noop */
    }
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const renderActivityLogs = () => {
    if (!timelineEl) return;
    const logsRaw = localStorage.getItem(activityLogStorageKey);
    let logs = [];
    try {
      logs = logsRaw ? JSON.parse(logsRaw) : [];
    } catch (error) {
      logs = [];
    }

    if (!logs.length) {
      timelineEl.innerHTML = '<li><span>안내</span>아직 기록된 활동 로그가 없습니다. 서비스를 사용하면 여기에 자동으로 쌓여요.</li>';
      return;
    }

    timelineEl.innerHTML = logs
      .slice(-12)
      .reverse()
      .map((log) => `<li><span>${formatTime(log.at)}</span>${log.message}</li>`)
      .join('');
  };

  renderActivityLogs();

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem(sessionStorageKey);
    window.location.href = 'index.html';
  });
});

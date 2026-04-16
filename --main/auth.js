document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('[data-auth-tab]');
  const panels = document.querySelectorAll('[data-auth-panel]');
  const openSignupLinks = document.querySelectorAll('[data-open-signup]');
  const openLoginLinks = document.querySelectorAll('[data-open-login]');
  const loginForm = document.getElementById('loginForm');
  const loginSubmitButton = loginForm?.querySelector('button[type="submit"]');
  const signupForm = document.getElementById('signupForm');
  const agreeAll = signupForm?.elements.namedItem('agreeAll');
  const requiredChecks = signupForm
    ? [
        signupForm.elements.namedItem('age'),
        signupForm.elements.namedItem('termsRequired'),
      ].filter(Boolean)
    : [];
  const signupSubmitButton = signupForm?.querySelector('button[type="submit"]');
  const userStorageKey = 'picoryAuthDemoUser';
  const sessionStorageKey = 'picoryAuthSession';
  const activityLogStorageKey = 'picoryActivityLogs';
  const authToast = document.getElementById('authToast');
  let toastTimer;

  const showToast = (message) => {
    if (!authToast) return;
    authToast.textContent = message;
    authToast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      authToast.classList.remove('is-visible');
    }, 2200);
  };

  const addActivityLog = (message) => {
    const raw = localStorage.getItem(activityLogStorageKey);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push({
      at: new Date().toISOString(),
      message,
    });
    localStorage.setItem(activityLogStorageKey, JSON.stringify(logs.slice(-80)));
  };

  const applyAuthNavState = () => {
    const sessionRaw = localStorage.getItem(sessionStorageKey);
    const loginLink = document.querySelector('.nav__actions .btn--primary');
    const navActions = document.querySelector('.nav__actions');
    if (!loginLink) return;
    const existingLogout = navActions?.querySelector('.nav__logout');

    if (sessionRaw) {
      loginLink.textContent = '마이페이지';
      loginLink.setAttribute('href', 'mypage.html');
      if (navActions && !existingLogout) {
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'nav__logout';
        logoutLink.textContent = '로그아웃';
        logoutLink.addEventListener('click', (event) => {
          event.preventDefault();
          localStorage.removeItem(sessionStorageKey);
          applyAuthNavState();
          window.location.href = 'index.html';
        });
        navActions.appendChild(logoutLink);
      }
    } else {
      loginLink.textContent = '로그인';
      loginLink.setAttribute('href', 'auth.html');
      existingLogout?.remove();
    }
  };

  const setPanel = (targetPanel) => {
    panels.forEach((panel) => {
      panel.classList.toggle('auth-panel--active', panel.dataset.authPanel === targetPanel);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.authTab;

      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('auth-tab--active', active);
        item.setAttribute('aria-selected', String(active));
      });

      panels.forEach((panel) => {
        panel.classList.toggle('auth-panel--active', panel.dataset.authPanel === target);
      });
    });
  });

  openSignupLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setPanel('signup');
    });
  });

  openLoginLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setPanel('login');
    });
  });

  document.querySelectorAll('.auth-social').forEach((button) => {
    button.addEventListener('click', () => {
      const provider = button.dataset.provider || '소셜';
      alert(`${provider} 로그인은 프로토타입 데모입니다.`);
    });
  });

  document.querySelectorAll('[data-password-toggle]').forEach((toggleButton) => {
    toggleButton.addEventListener('click', () => {
      const input = toggleButton.parentElement?.querySelector('input');
      if (!input) return;
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      toggleButton.setAttribute('aria-label', reveal ? '비밀번호 숨기기' : '비밀번호 보기 전환');
      toggleButton.style.color = reveal ? '#ff5c00' : '#8f8f8f';
    });
  });

  const updateSignupSubmitState = () => {
    if (!signupForm || !signupSubmitButton) return;

    const signupId = String(signupForm.elements.namedItem('signupId')?.value || '').trim();
    const signupPassword = String(signupForm.elements.namedItem('signupPassword')?.value || '').trim();
    const nickname = String(signupForm.elements.namedItem('nickname')?.value || '').trim();
    const requiredAgreed = requiredChecks.every((checkbox) => checkbox.checked);

    signupSubmitButton.disabled = !(signupId && signupPassword && nickname && requiredAgreed);
  };

  const updateLoginSubmitState = () => {
    if (!loginForm || !loginSubmitButton) return;
    const username = String(loginForm.elements.namedItem('username')?.value || '').trim();
    const password = String(loginForm.elements.namedItem('password')?.value || '').trim();
    loginSubmitButton.classList.toggle('is-ready', Boolean(username && password));
  };

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = String(loginForm.elements.namedItem('username')?.value || '').trim();
    const password = String(loginForm.elements.namedItem('password')?.value || '').trim();
    const savedUser = localStorage.getItem(userStorageKey);

    if (!savedUser) {
      alert('가입된 계정이 없습니다. 먼저 회원가입을 진행해주세요.');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.id === username && parsedUser.password === password) {
        showToast(`${parsedUser.nickname}님 반갑습니다!`);
        localStorage.setItem(
          sessionStorageKey,
          JSON.stringify({
            id: parsedUser.id,
            nickname: parsedUser.nickname,
          })
        );
        addActivityLog(`${parsedUser.nickname} 계정으로 로그인했어요.`);
        applyAuthNavState();
        window.setTimeout(() => {
          window.location.href = 'mypage.html';
        }, 900);
      } else {
        alert('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      alert('저장된 계정 정보를 불러오지 못했습니다. 다시 가입해주세요.');
    }
  });

  loginForm?.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updateLoginSubmitState);
    input.addEventListener('change', updateLoginSubmitState);
  });

  agreeAll?.addEventListener('change', () => {
    if (!signupForm) return;
    signupForm.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = agreeAll.checked;
    });
    updateSignupSubmitState();
  });

  signupForm?.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updateSignupSubmitState);
    input.addEventListener('change', updateSignupSubmitState);
  });

  signupForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const signupId = String(signupForm.elements.namedItem('signupId')?.value || '').trim();
    const signupPassword = String(signupForm.elements.namedItem('signupPassword')?.value || '').trim();
    const nickname = String(signupForm.elements.namedItem('nickname')?.value || '').trim();
    const requiredAgreed = requiredChecks.every((checkbox) => checkbox.checked);

    if (!signupId || !signupPassword || !nickname || !requiredAgreed) {
      alert('아이디, 비밀번호, 닉네임 입력과 필수 동의 체크가 필요합니다.');
      return;
    }

    localStorage.setItem(
      userStorageKey,
      JSON.stringify({
        id: signupId,
        password: signupPassword,
        nickname,
      })
    );

    addActivityLog(`${nickname} 닉네임으로 회원가입을 완료했어요.`);
    alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    setPanel('login');
    if (loginForm) {
      const usernameField = loginForm.elements.namedItem('username');
      if (usernameField) usernameField.value = signupId;
    }
  });

  updateSignupSubmitState();
  updateLoginSubmitState();
  applyAuthNavState();
});

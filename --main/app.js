/* ========================================
   SHUTTER - Camera Integration Platform
   Interactive Behaviors
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  const sessionStorageKey = 'picoryAuthSession';
  const activityLogStorageKey = 'picoryActivityLogs';

  function addActivityLog(message) {
    const raw = localStorage.getItem(activityLogStorageKey);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push({
      at: new Date().toISOString(),
      message,
    });
    localStorage.setItem(activityLogStorageKey, JSON.stringify(logs.slice(-80)));
  }

  function updateAuthNavButton() {
    const loginLink = document.querySelector('.nav__actions .btn--primary');
    const navActions = document.querySelector('.nav__actions');
    if (!loginLink) return;
    const sessionRaw = localStorage.getItem(sessionStorageKey);
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
          updateAuthNavButton();
          window.location.href = 'index.html';
        });
        navActions.appendChild(logoutLink);
      }
    } else {
      loginLink.textContent = '로그인';
      loginLink.setAttribute('href', 'auth.html');
      existingLogout?.remove();
    }
  }

  updateAuthNavButton();

  // ===== Nav 주황 배지 — 클릭 시 숨김, 해당 페이지 방문 시에도 숨김 =====
  const NAV_BADGE_STORAGE_KEY = 'picoryNavBadgesSeen';
  function navBadgeGetSeen() {
    try {
      return JSON.parse(localStorage.getItem(NAV_BADGE_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function navBadgeSetSeen(key) {
    const seen = navBadgeGetSeen();
    seen[key] = true;
    localStorage.setItem(NAV_BADGE_STORAGE_KEY, JSON.stringify(seen));
  }
  function navBadgeKeyFromPath() {
    const file = (window.location.pathname || '').split('/').pop() || '';
    if (file === 'recommend.html') return 'recommend';
    if (file === 'price.html') return 'price';
    if (file === 'checklist.html') return 'checklist';
    if (file === 'community.html') return 'community';
    return null;
  }
  (function initNavBadges() {
    const seen = navBadgeGetSeen();
    const fromPath = navBadgeKeyFromPath();
    if (fromPath) {
      navBadgeSetSeen(fromPath);
      seen[fromPath] = true;
    }
    document.querySelectorAll('[data-nav-badge]').forEach((link) => {
      const key = link.getAttribute('data-nav-badge');
      if (!key) return;
      if (seen[key] || link.classList.contains('nav__link--active')) {
        link.classList.add('nav__link--badge-off');
      }
      link.addEventListener('click', () => {
        navBadgeSetSeen(key);
        document.querySelectorAll(`[data-nav-badge="${key}"]`).forEach((el) => {
          el.classList.add('nav__link--badge-off');
        });
      });
    });
  })();

  // ===== Bookmark Data Store =====
  const bookmarks = [];

  function updateBookmarkUI() {
    const list = document.getElementById('bookmarkList');
    const empty = document.getElementById('bookmarkEmpty');
    const footer = document.getElementById('bookmarkFooter');

    if (bookmarks.length === 0) {
      empty.classList.remove('hidden');
      list.classList.add('hidden');
      footer.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');
    footer.classList.remove('hidden');

    list.innerHTML = bookmarks.map((bm, i) => `
      <div class="bookmark-card">
        <div class="bookmark-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div class="bookmark-card__info">
          <div class="bookmark-card__name">${bm.name}</div>
          <div class="bookmark-card__sub">${bm.lens} &middot; ${bm.price}</div>
        </div>
        <button class="bookmark-card__remove" data-index="${i}" aria-label="삭제">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    // Bind remove buttons
    list.querySelectorAll('.bookmark-card__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        bookmarks.splice(idx, 1);
        // Update toggle state of bookmark-add buttons
        syncBookmarkButtons();
        updateBookmarkUI();
      });
    });
  }

  function syncBookmarkButtons() {
    document.querySelectorAll('.bookmark-add').forEach((btn) => {
      const card = btn.closest('.recommend-card') || btn.closest('.product-card');
      if (!card) return;
      let name = '';
      if (card.classList.contains('recommend-card')) {
        name = card.querySelector('.recommend-card__name')?.textContent?.trim() || '';
      } else {
        const brand = card.querySelector('.product-card__brand')?.textContent?.trim() || '';
        const model = card.querySelector('.product-card__model')?.textContent?.trim() || '';
        name = `${brand} ${model}`.trim();
      }
      const exists = bookmarks.some((bm) => bm.name === name);
      btn.classList.toggle('active', exists);
    });
  }

  window.syncPicoryBookmarks = syncBookmarkButtons;

  // ===== Upload Zone =====
  const uploadZone = document.getElementById('uploadZone');
  const uploadIdle = document.getElementById('uploadIdle');
  const uploadLoading = document.getElementById('uploadLoading');
  const fileInput = document.getElementById('fileInput');
  const resultSection = document.getElementById('resultSection');
  const previewImg = document.getElementById('previewImg');

  if (uploadZone && fileInput && uploadIdle && uploadLoading && resultSection && previewImg) {
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleUpload(file);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) {
        handleUpload(fileInput.files[0]);
      }
    });
  }

  function handleUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.style.backgroundImage = `url(${e.target.result})`;
    };
    reader.readAsDataURL(file);

    uploadIdle.classList.add('hidden');
    uploadLoading.classList.remove('hidden');

    setTimeout(() => {
      uploadLoading.classList.add('hidden');
      uploadIdle.classList.remove('hidden');
      resultSection.classList.remove('hidden');
      applyRecommendCameraThumbnails();
      window.syncPicoryBookmarks?.();
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 2000);
  }

  /** AI 추천 카드에 카탈로그 카메라 이미지 주입 (recommend.html의 bridge.js가 있으면 mockData 기반 매핑) */
  function applyRecommendCameraThumbnails() {
    const getThumb = window.picoryGetRecommendThumbnail;
    const fallbackThumb = {
      'Sony A7C II': 'images/cameras/sony-a7c-ii.png',
      'Fujifilm X-T5': 'images/cameras/fujifilm-x-s20.png',
    };
    document.querySelectorAll('.recommend-card').forEach((card) => {
      const nameEl = card.querySelector('.recommend-card__name');
      const imgWrap = card.querySelector('.recommend-card__img');
      if (!nameEl || !imgWrap) return;
      const name = nameEl.textContent.trim();
      const src =
        typeof getThumb === 'function'
          ? getThumb(name)
          : fallbackThumb[name] || 'images/cameras/default-camera.png';
      imgWrap.replaceChildren();
      const img = document.createElement('img');
      img.className = 'recommend-card__photo';
      img.alt = `${name} 제품 이미지`;
      img.src = src;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => {
        img.onerror = null;
        img.src = 'images/cameras/default-camera.png';
      };
      imgWrap.appendChild(img);
    });
  }

  // ===== Bookmark Add (이벤트 위임: 추천 카드 + 상품 카드 동적 생성 대응) =====
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.bookmark-add');
    if (!btn) return;
    const card = btn.closest('.recommend-card') || btn.closest('.product-card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();

    let name = '';
    let lens = '';
    let price = '';

    if (card.classList.contains('recommend-card')) {
      name = card.querySelector('.recommend-card__name')?.textContent?.trim() || '';
      lens = (card.querySelector('.recommend-card__lens')?.textContent || '').replace('+ ', '').trim();
      price = card.querySelector('.price-value')?.textContent?.trim() || '';
    } else {
      const brand = card.querySelector('.product-card__brand')?.textContent?.trim() || '';
      const model = card.querySelector('.product-card__model')?.textContent?.trim() || '';
      name = `${brand} ${model}`.trim();
      lens = card.querySelector('.product-card__platform')?.textContent?.trim() || '상품 카탈로그';
      price = card.querySelector('.product-card__price')?.textContent?.trim() || '';
    }

    if (!name) return;

    const existIdx = bookmarks.findIndex((bm) => bm.name === name);
    if (existIdx >= 0) {
      bookmarks.splice(existIdx, 1);
      btn.classList.remove('active');
      addActivityLog(`${name}을(를) 북마크에서 제거했어요.`);
    } else {
      bookmarks.push({ name, lens, price });
      btn.classList.add('active');
      document.getElementById('bookmarkSidebar')?.classList.add('open');
      addActivityLog(`${name}을(를) 북마크에 추가했어요.`);
    }
    updateBookmarkUI();
  });

  // ===== Checklist Flow =====
  const steps = document.querySelectorAll('.checklist-step');
  const checklistSubmit = document.getElementById('checklistSubmit');
  const checklistResult = document.getElementById('checklistResult');
  const checklistResultBtn = document.getElementById('checklistResultBtn');

  steps.forEach((step) => {
    const options = step.querySelectorAll('.checklist-option');
    const isMulti = step.querySelector('.checklist-options--multi') !== null;

    options.forEach((option) => {
      option.addEventListener('click', () => {
        if (isMulti) {
          option.classList.toggle('selected');
        } else {
          options.forEach(o => o.classList.remove('selected'));
          option.classList.add('selected');

          const currentStep = parseInt(step.dataset.step);
          step.classList.remove('active');
          step.classList.add('completed');

          const nextStep = document.querySelector(`[data-step="${currentStep + 1}"]`);
          if (nextStep) {
            nextStep.classList.add('active');
            setTimeout(() => {
              nextStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
          } else {
            checklistSubmit.classList.remove('hidden');
          }
        }
      });
    });

    if (isMulti) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn--outline btn--sm';
      nextBtn.textContent = '다음';
      nextBtn.style.marginTop = '12px';
      nextBtn.addEventListener('click', () => {
        const currentStep = parseInt(step.dataset.step);
        step.classList.remove('active');
        step.classList.add('completed');

        const nextStepEl = document.querySelector(`[data-step="${currentStep + 1}"]`);
        if (nextStepEl) {
          nextStepEl.classList.add('active');
          setTimeout(() => {
            nextStepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        } else {
          checklistSubmit.classList.remove('hidden');
        }
      });
      step.querySelector('.checklist-options').after(nextBtn);
    }
  });

  // Checklist result button
  checklistResultBtn?.addEventListener('click', () => {
    checklistSubmit.classList.add('hidden');
    checklistResult.classList.remove('hidden');
    checklistResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    addActivityLog('체크리스트 추천 결과를 확인했어요.');
  });

  // ===== Tooltip System =====
  const tooltip = document.getElementById('globalTooltip');

  function initTooltips() {
    document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
      trigger.addEventListener('mouseenter', () => {
        const text = trigger.dataset.tooltip;
        if (!text) return;
        tooltip.textContent = text;
        tooltip.classList.add('visible');

        const rect = trigger.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;

        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth - 16) {
          tooltip.style.left = `${window.innerWidth - tooltipRect.width - 16}px`;
        }
      });

      trigger.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      trigger.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const text = trigger.dataset.tooltip;
        if (!text) return;
        tooltip.textContent = text;
        tooltip.classList.add('visible');

        const rect = trigger.getBoundingClientRect();
        tooltip.style.left = `${Math.max(16, rect.left)}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;

        setTimeout(() => tooltip.classList.remove('visible'), 3000);
      });
    });
  }
  initTooltips();

  // ===== Community: camera tag → popover (상품 페이지) =====
  const cameraTagPopover = document.getElementById('cameraTagPopover');
  const cameraTagPopoverLink = document.getElementById('cameraTagPopoverLink');
  const cameraTagButtons = document.querySelectorAll('.gallery-card__camera-tag');
  let cameraHideTimer = null;
  let cameraActiveBtn = null;

  function positionCameraPopover(anchor) {
    if (!cameraTagPopover || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const gap = 8;
    cameraTagPopover.style.left = '0px';
    cameraTagPopover.style.top = '0px';
    requestAnimationFrame(() => {
      const pw = cameraTagPopover.offsetWidth;
      const ph = cameraTagPopover.offsetHeight;
      let left = r.left + r.width / 2 - pw / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
      let top = r.bottom + gap;
      if (top + ph > window.innerHeight - 12) {
        top = Math.max(12, r.top - ph - gap);
      }
      cameraTagPopover.style.left = `${left}px`;
      cameraTagPopover.style.top = `${top}px`;
    });
  }

  function showCameraPopover(anchor) {
    if (!cameraTagPopover || !cameraTagPopoverLink || !anchor) return;
    const href = anchor.getAttribute('data-products-href') || 'products.html';
    cameraTagPopoverLink.setAttribute('href', href);
    cameraTagPopover.hidden = false;
    cameraActiveBtn = anchor;
    cameraTagButtons.forEach((b) => b.setAttribute('aria-expanded', b === anchor ? 'true' : 'false'));
    positionCameraPopover(anchor);
  }

  function hideCameraPopover() {
    if (!cameraTagPopover) return;
    cameraTagPopover.hidden = true;
    cameraActiveBtn = null;
    cameraTagButtons.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  if (cameraTagPopover && cameraTagPopoverLink && cameraTagButtons.length) {
    cameraTagButtons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        clearTimeout(cameraHideTimer);
        showCameraPopover(btn);
      });
      btn.addEventListener('mouseleave', () => {
        cameraHideTimer = setTimeout(hideCameraPopover, 200);
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cameraActiveBtn === btn && !cameraTagPopover.hidden) {
          hideCameraPopover();
        } else {
          showCameraPopover(btn);
        }
      });
    });

    cameraTagPopover.addEventListener('mouseenter', () => clearTimeout(cameraHideTimer));
    cameraTagPopover.addEventListener('mouseleave', () => {
      cameraHideTimer = setTimeout(hideCameraPopover, 200);
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.gallery-card__camera-tag') || e.target.closest('#cameraTagPopover')) return;
      hideCameraPopover();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideCameraPopover();
    });

    window.addEventListener('scroll', () => {
      if (cameraActiveBtn && !cameraTagPopover.hidden) positionCameraPopover(cameraActiveBtn);
    }, true);
  }

  // ===== Bookmark Sidebar =====
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  const sidebar = document.getElementById('bookmarkSidebar');
  const closeSidebar = document.getElementById('closeSidebar');

  if (bookmarkBtn && sidebar) {
    bookmarkBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  closeSidebar?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
  });

  // Compare button
  document.getElementById('compareBtn')?.addEventListener('click', () => {
    if (bookmarks.length < 2) {
      alert('비교하려면 카메라를 2개 이상 북마크해 주세요.');
      return;
    }
    addActivityLog(`${bookmarks.map(b => b.name).join(', ')} 카메라 비교를 시도했어요.`);
    alert(`${bookmarks.map(b => b.name).join(' vs ')} 비교 화면으로 이동합니다.\n(프로토타입 데모)`);
  });

  // ===== Glossary Modal =====
  const glossaryModal = document.getElementById('glossaryModal');
  const openGlossaryBtn = document.getElementById('openGlossaryBtn');
  const closeGlossary = document.getElementById('closeGlossary');
  const glossarySearchInput = document.getElementById('glossarySearchInput');

  openGlossaryBtn?.addEventListener('click', () => {
    glossaryModal.classList.remove('hidden');
  });

  closeGlossary?.addEventListener('click', () => {
    glossaryModal.classList.add('hidden');
  });

  glossaryModal?.addEventListener('click', (e) => {
    if (e.target === glossaryModal) {
      glossaryModal.classList.add('hidden');
    }
  });

  // Glossary search
  glossarySearchInput?.addEventListener('input', () => {
    const query = glossarySearchInput.value.toLowerCase().trim();
    const items = document.querySelectorAll('.glossary-item');
    items.forEach(item => {
      const term = item.querySelector('.glossary-item__term').textContent.toLowerCase();
      const desc = item.querySelector('.glossary-item__desc').textContent.toLowerCase();
      const matches = !query || term.includes(query) || desc.includes(query);
      item.style.display = matches ? '' : 'none';
    });
  });

  // ===== Upload Post Modal =====
  const uploadModal = document.getElementById('uploadModal');
  const uploadPostBtn = document.getElementById('uploadPostBtn');
  const closeUploadModal = document.getElementById('closeUploadModal');

  uploadPostBtn?.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
  });

  closeUploadModal?.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
  });

  uploadModal?.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
      uploadModal.classList.add('hidden');
    }
  });

  // Upload modal category chips (single-select)
  const uploadChips = uploadModal?.querySelectorAll('.filter-chip');
  uploadChips?.forEach(chip => {
    chip.addEventListener('click', () => {
      uploadChips.forEach(c => c.classList.remove('filter-chip--active'));
      chip.classList.add('filter-chip--active');
    });
  });

  // ===== Community gallery filters (data-community-filter + data-community-tags) =====
  const communityFilters = document.querySelector('#community .community-filters');
  const communityGalleryGrid = document.querySelector('#communityGalleryGrid');

  function applyCommunityGalleryFilter(filterKey) {
    if (!communityGalleryGrid) return;
    const cards = communityGalleryGrid.querySelectorAll('.gallery-card[data-community-tags]');
    cards.forEach((card) => {
      const tags = (card.dataset.communityTags || '').trim().split(/\s+/).filter(Boolean);
      let show = true;
      if (filterKey && filterKey !== 'all') {
        show = tags.includes(filterKey);
      }
      card.hidden = !show;
      card.style.display = show ? '' : 'none';
    });
  }

  communityFilters?.querySelectorAll('[data-community-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filterKey = chip.getAttribute('data-community-filter') || 'all';
      communityFilters.querySelectorAll('[data-community-filter]').forEach((c) => {
        c.classList.toggle('filter-chip--active', c === chip);
        c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
      });
      applyCommunityGalleryFilter(filterKey);
    });
  });

  applyCommunityGalleryFilter('all');

  // ===== Mobile Hamburger Menu =====
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburgerBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  document.querySelectorAll('.mobile-menu__link').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
    });
  });

  // ===== Landing Banner Slider =====
  const bannerSlider = document.querySelector('[data-banner-slider]');
  if (bannerSlider) {
    const slides = Array.from(bannerSlider.querySelectorAll('.landing-banner__slide'));
    const track = bannerSlider.querySelector('.landing-banner__track');
    const dots = Array.from(bannerSlider.querySelectorAll('[data-banner-dot]'));
    const prevBtn = bannerSlider.querySelector('[data-banner-prev]');
    const nextBtn = bannerSlider.querySelector('[data-banner-next]');
    let currentIndex = 0;
    let autoPlayId;

    const n = slides.length;
    if (track && n > 0) {
      track.style.width = `${n * 100}%`;
      slides.forEach((s) => {
        const w = `${100 / n}%`;
        s.style.flex = `0 0 ${w}`;
        s.style.width = w;
      });
    }

    const renderSlide = (index) => {
      if (track && n > 0) {
        const pct = (100 / n) * index;
        track.style.transform = `translate3d(-${pct}%, 0, 0)`;
      }

      slides.forEach((slide, slideIndex) => {
        slide.setAttribute('aria-hidden', slideIndex === index ? 'false' : 'true');
      });

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === index);
      });

      currentIndex = index;
    };

    const moveSlide = (direction) => {
      const nextIndex = (currentIndex + direction + slides.length) % slides.length;
      renderSlide(nextIndex);
    };

    const startAutoPlay = () => {
      clearInterval(autoPlayId);
      autoPlayId = setInterval(() => moveSlide(1), 6500);
    };

    prevBtn?.addEventListener('click', () => {
      moveSlide(-1);
      startAutoPlay();
    });

    nextBtn?.addEventListener('click', () => {
      moveSlide(1);
      startAutoPlay();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        renderSlide(index);
        startAutoPlay();
      });
    });

    bannerSlider.addEventListener('mouseenter', () => clearInterval(autoPlayId));
    bannerSlider.addEventListener('mouseleave', startAutoPlay);

    renderSlide(0);
    startAutoPlay();
  }

  // ===== Smooth Scroll for Nav Links =====
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ===== Nav Active State on Scroll =====
  const sections = document.querySelectorAll('section[id]');
  const navLinks = Array.from(document.querySelectorAll('.nav__link'))
    .filter(link => link.getAttribute('href')?.startsWith('#'));

  if (navLinks.length > 0) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY + 100;

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');

        if (scrollY >= top && scrollY < top + height) {
          navLinks.forEach((link) => {
            link.classList.remove('nav__link--active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('nav__link--active');
            }
          });
        }
      });
    });
  }

  // ===== Close modals on Escape key =====
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      glossaryModal?.classList.add('hidden');
      uploadModal?.classList.add('hidden');
      sidebar?.classList.remove('open');
    }
  });

});

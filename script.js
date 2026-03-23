/* ============================================================
   GILETTE KWAYE — script.js refonte
   Vanilla JS uniquement, pas de dépendance externe
   ============================================================ */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ── 1. THÈME CLAIR / SOMBRE ──────────────────────────── */
  var html     = document.documentElement;
  var themeBtn = document.getElementById('theme-toggle');
  var THEME_KEY = 'gk-theme';

  /* FIX CRITIQUE : localStorage peut throw en navigation privée /
     Safari / Firefox strict-mode / iframes sandbox.
     Sans ce try-catch, le script entier crashait ici, rendant
     toutes les sections INVISIBLES (opacity:0 jamais levée). */
  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* silent */ }
  }

  function applyTheme(theme, persist) {
    html.setAttribute('data-theme', theme);
    if (persist) storageSet(THEME_KEY, theme);
  }

  function initTheme() {
    var saved = storageGet(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved, false);
      return;
    }
    var prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light', false);
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = html.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }

  try {
    var themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var handleThemeChange = function (e) {
      if (!storageGet(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light', false);
    };
    if (typeof themeMediaQuery.addEventListener === 'function') {
      themeMediaQuery.addEventListener('change', handleThemeChange);
    } else if (typeof themeMediaQuery.addListener === 'function') {
      themeMediaQuery.addListener(handleThemeChange);
    }
  } catch (e) { /* matchMedia absent sur très vieux navigateurs */ }

  initTheme();

  /* ── 2. HEADER SCROLL & BURGER ────────────────────────── */
  var header    = document.getElementById('header');
  var burgerBtn = document.getElementById('burger-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  var mobileLinks = document.querySelectorAll('.mobile-menu__link');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('header--scrolled', y > 40);
    updateBackToTop(y);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMobileMenu() {
    if (!mobileMenu || !burgerBtn || !header) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    burgerBtn.setAttribute('aria-expanded', 'false');
    header.classList.remove('header--open');
    burgerBtn.setAttribute('aria-label', 'Ouvrir le menu');
  }

  function openMobileMenu() {
    if (!mobileMenu || !burgerBtn || !header) return;
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    burgerBtn.setAttribute('aria-expanded', 'true');
    header.classList.add('header--open');
    burgerBtn.setAttribute('aria-label', 'Fermer le menu');
  }

  if (burgerBtn && mobileMenu) {
    burgerBtn.addEventListener('click', function () {
      mobileMenu.classList.contains('is-open') ? closeMobileMenu() : openMobileMenu();
    });
  }

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileMenu();
  });

  /* ── 3. BACK TO TOP ────────────────────────────────────── */
  var backToTop = document.getElementById('back-to-top');

  function updateBackToTop(y) {
    if (!backToTop) return;
    var visible = y > 400;
    backToTop.classList.toggle('is-visible', visible);
    backToTop.setAttribute('aria-hidden', String(!visible));
  }

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── 4. CAROUSEL ───────────────────────────────────────── */
  function initCarousel(opts) {
    var carouselEl = opts.carouselEl;
    var trackEl    = opts.trackEl;
    var dotsEl     = opts.dotsEl;
    var prevBtn    = opts.prevBtn;
    var nextBtn    = opts.nextBtn;
    var autoplayMs = opts.autoplayMs !== undefined ? opts.autoplayMs : 4000;

    if (!carouselEl || !trackEl) return;

    var slides = Array.from(trackEl.querySelectorAll('.carousel__slide'));

    if (slides.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    var current = 0;
    var autoplayTimer = null;

    if (dotsEl) {
      dotsEl.innerHTML = '';
      slides.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.className = 'carousel__dot';
        dot.setAttribute('type', 'button');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Image ' + (i + 1));
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.addEventListener('click', function () { goTo(i); });
        dotsEl.appendChild(dot);
      });
    }

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      trackEl.style.transform = 'translateX(-' + (current * 100) + '%)';
      if (dotsEl) {
        dotsEl.querySelectorAll('.carousel__dot').forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === current);
          dot.setAttribute('aria-selected', String(i === current));
        });
      }
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () { prev(); resetAutoplay(); });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () { next(); resetAutoplay(); });
    }

    var touchStartX = 0;
    carouselEl.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    carouselEl.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); resetAutoplay(); }
    }, { passive: true });
    carouselEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { prev(); resetAutoplay(); }
      if (e.key === 'ArrowRight') { next(); resetAutoplay(); }
    });

    function startAutoplay() {
      if (!autoplayMs || autoplayTimer) return;
      autoplayTimer = setInterval(next, autoplayMs);
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    carouselEl.addEventListener('mouseenter', stopAutoplay);
    carouselEl.addEventListener('mouseleave', startAutoplay);

    if ('IntersectionObserver' in window) {
      var pauseObs = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) startAutoplay();
        else stopAutoplay();
      }, { threshold: 0.1 });
      pauseObs.observe(carouselEl);
    } else {
      startAutoplay();
    }

    goTo(0);
  }

  initCarousel({
    carouselEl: document.getElementById('hero-carousel'),
    trackEl:    document.getElementById('hero-track'),
    dotsEl:     document.getElementById('hero-dots'),
    prevBtn:    document.getElementById('hero-prev'),
    nextBtn:    document.getElementById('hero-next'),
    autoplayMs: 4500,
  });

  initCarousel({
    carouselEl: document.getElementById('ambiance-carousel'),
    trackEl:    document.getElementById('ambiance-track'),
    dotsEl:     document.getElementById('ambiance-dots'),
    prevBtn:    document.getElementById('ambiance-prev'),
    nextBtn:    document.getElementById('ambiance-next'),
    autoplayMs: 5000,
  });

  /* ── 5. REVEAL AU SCROLL ───────────────────────────────── */
  /* FIX : threshold 0.04 (plus facile à déclencher),
           rootMargin neutre (plus de valeur négative agressive),
           + fallback timeout de sécurité à 200 ms.           */
  var revealEls = document.querySelectorAll('.reveal, .reveal-item');

  function doReveal(el) {
    el.classList.add('is-visible');
  }

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            doReveal(entry.target);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: '0px 0px 0px 0px' }
    );

    revealEls.forEach(function (el) { revealObserver.observe(el); });

    /* Fallback de sécurité : éléments déjà dans le viewport au chargement */
    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (!el.classList.contains('is-visible')) {
          var rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            doReveal(el);
          }
        }
      });
    }, 200);

  } else {
    revealEls.forEach(function (el) { doReveal(el); });
  }

  /* ── 6. NAVIGATION ACTIVE AU SCROLL ────────────────────── */
  var sections = document.querySelectorAll('main > section[id]');
  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');

  function updateActiveNav() {
    var y = (window.scrollY || window.pageYOffset) + 120;
    var activeId = '';
    sections.forEach(function (section) {
      if (section.offsetTop <= y) activeId = section.getAttribute('id');
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href').slice(1);
      link.classList.toggle('nav__link--active', href === activeId);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  /* ── 7. FORMULAIRE ─────────────────────────────────────── */
  var form       = document.getElementById('contact-form');
  var submitBtn  = document.getElementById('submit-btn');
  var successMsg = document.getElementById('form-success');

  function validateField(input, errorId) {
    if (!input) return true;
    var errorEl = document.getElementById(errorId);
    var msg = '';
    if (input.required && !input.value.trim()) {
      msg = 'Ce champ est obligatoire.';
    } else if (input.type === 'tel' && input.value.trim()) {
      var cleaned = input.value.replace(/\s/g, '');
      if (!/^(\+262|0[26])[0-9]{8,9}$/.test(cleaned)) {
        msg = 'Numéro invalide (ex : 06 93 00 00 00).';
      }
    }
    if (errorEl) errorEl.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  if (form) {
    form.querySelectorAll('.form__input').forEach(function (input) {
      var errorId = input.id.replace('form-', 'error-');
      input.addEventListener('blur', function () { validateField(input, errorId); });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input, errorId);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      var name    = document.getElementById('form-name');
      var phone   = document.getElementById('form-phone');
      var message = document.getElementById('form-message');

      if (!validateField(name, 'error-name'))       { valid = false; if (name) name.focus(); }
      if (!validateField(phone, 'error-phone'))     { if (valid && phone) phone.focus(); valid = false; }
      if (!validateField(message, 'error-message')) { if (valid && message) message.focus(); valid = false; }

      if (!valid || !submitBtn) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';

      setTimeout(function () {
        form.reset();
        form.style.display = 'none';
        if (successMsg) {
          successMsg.style.display = 'flex';
          successMsg.setAttribute('aria-hidden', 'false');
        }
      }, 900);
    });
  }

  /* ── 8. ANNÉE DANS LE FOOTER ───────────────────────────── */
  var yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── 9. SMOOTH SCROLL POUR LES ANCRES INTERNES ─────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var offset = header ? header.offsetHeight : 0;
      var top = target.getBoundingClientRect().top +
                (window.scrollY || window.pageYOffset) - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

})();

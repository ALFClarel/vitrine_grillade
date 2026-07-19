(() => {
  'use strict';

  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.getElementById('site-nav');
  const menuLabel = menuButton?.querySelector('.sr-only');
  const desktopQuery = window.matchMedia('(min-width: 900px)');

  function setMenu(open, returnFocus = false) {
    if (!menuButton || !navigation) return;

    const canOpen = !desktopQuery.matches;
    const nextState = canOpen && open;
    navigation.classList.toggle('is-open', nextState);
    menuButton.setAttribute('aria-expanded', String(nextState));
    if (menuLabel) menuLabel.textContent = nextState ? 'Fermer le menu' : 'Ouvrir le menu';

    if (nextState) {
      navigation.querySelector('a')?.focus();
    } else if (returnFocus) {
      menuButton.focus();
    }
  }

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  navigation?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
    }
  });

  document.addEventListener('click', (event) => {
    if (
      menuButton?.getAttribute('aria-expanded') === 'true' &&
      !menuButton.contains(event.target) &&
      !navigation?.contains(event.target)
    ) {
      setMenu(false);
    }
  });

  desktopQuery.addEventListener?.('change', () => setMenu(false));

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

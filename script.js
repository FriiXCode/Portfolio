(() => {
  const body = document.body;

  // ---- Hero entrance: one orchestrated moment ----
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-ready')));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(start);
  } else {
    start();
  }

  // ---- Light / dark toggle (system preference until the visitor chooses) ----
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const metaLight = document.getElementById('themeColorLight');
  const metaDark = document.getElementById('themeColorDark');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches;
  const syncToggle = () => {
    const dark = isDark();
    const label = dark ? 'Zapnúť svetlý režim' : 'Zapnúť tmavý režim';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    if (root.dataset.theme) {
      const c = dark ? '#0A0F2E' : '#EEF1F7';
      metaLight.content = c; metaDark.content = c;
    }
  };
  toggle.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncToggle();
  });
  systemDark.addEventListener('change', syncToggle);
  syncToggle();

  // ---- Nav background once the hero top leaves the viewport ----
  const navbar = document.getElementById('navbar');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;height:40px;width:1px;pointer-events:none';
  sentinel.setAttribute('aria-hidden', 'true');
  body.prepend(sentinel);
  new IntersectionObserver(([entry]) => {
    navbar.classList.toggle('is-scrolled', !entry.isIntersecting);
  }).observe(sentinel);

  // ---- Mobile menu ----
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('navLinks');
  const setMenu = (open) => {
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Zavrieť menu' : 'Otvoriť menu');
    menu.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
  };
  hamburger.addEventListener('click', () => setMenu(hamburger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // ---- Current section in nav ----
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        const current = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('is-current', current);
        if (current) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => navObs.observe(s));

  // ---- Project filter ----
  const grid = document.getElementById('projectsGrid');
  const items = [...grid.querySelectorAll('.work')];
  const buttons = [...document.querySelectorAll('.filter-btn')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  buttons.forEach(btn => btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    buttons.forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    grid.classList.toggle('is-filtered', filter !== 'all');
    items.forEach(item => {
      const match = filter === 'all' || item.dataset.category === filter;
      item.hidden = !match;
      if (match && !reduce) {
        item.animate(
          [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' }
        );
      }
    });
  }));

  // ---- Contact form ----
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('formSubmitBtn');
  const btnText = document.getElementById('formBtnText');
  const status = document.getElementById('formStatus');

  const messages = {
    name: 'Napíšte svoje meno.',
    email: 'Zadajte e-mail v tvare meno@domena.sk.',
    message: 'Napíšte, s čím vám môžem pomôcť.'
  };

  const showError = (field) => {
    const id = field.id + 'Error';
    let el = document.getElementById(id);
    if (field.validity.valid) {
      field.removeAttribute('aria-invalid');
      if (el) el.remove();
      if (field.id === 'formMsg') field.setAttribute('aria-describedby', 'formMsgHelp');
      else field.removeAttribute('aria-describedby');
      return true;
    }
    field.setAttribute('aria-invalid', 'true');
    if (!el) {
      el = document.createElement('p');
      el.className = 'field-error';
      el.id = id;
      field.parentElement.appendChild(el);
    }
    el.textContent = messages[field.name];
    field.setAttribute('aria-describedby', (field.id === 'formMsg' ? 'formMsgHelp ' : '') + id);
    return false;
  };

  const fields = [...form.querySelectorAll('input:not([type=hidden]), textarea')];
  fields.forEach(f => f.addEventListener('blur', () => { if (f.value) showError(f); }));
  fields.forEach(f => f.addEventListener('input', () => { if (f.getAttribute('aria-invalid')) showError(f); }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');

    const invalid = fields.filter(f => !showError(f));
    if (invalid.length) { invalid[0].focus(); return; }

    btn.disabled = true;
    btnText.textContent = 'Odosielam…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === 'false' || data.success === false) throw new Error('send failed');
      form.reset();
      status.textContent = 'Správa odoslaná. Ozvem sa do 24 hodín.';
    } catch (err) {
      status.classList.add('is-error');
      status.innerHTML = 'Správu sa nepodarilo odoslať. Skúste to znova alebo mi zavolajte na <a href="tel:+421949363438">0949 363 438</a>.';
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Odoslať správu';
    }
  });
})();

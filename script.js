(() => {
  const body = document.body;

  // ---- Hero entrance: one orchestrated moment ----
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-ready')));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(start);
  } else {
    start();
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---- Living type: each letter of the claim answers the pointer ----
  // Letters near the pointer widen and thicken, a ring around them
  // narrows, everything else rests at the house width. Driven by the
  // font's own width and weight axes; positions are measured at rest so
  // the effect never feeds back into itself.
  const claim = document.querySelector('.hero-claim');
  if (claim && !reduceMotion) {
    const BASE_W = 114, BASE_G = 800;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = [...claim.querySelectorAll('.line > span')].map(s => s.textContent.trim()).join(' ');
    claim.querySelectorAll('.line').forEach(line => {
      line.setAttribute('aria-hidden', 'true');
      const inner = line.firstElementChild;
      inner.innerHTML = inner.textContent.trim().split(' ')
        .map(word => `<span class="w">${[...word].map(ch => `<span class="ch">${ch}</span>`).join('')}</span>`)
        .join(' ');
    });
    claim.prepend(sr);

    const letters = [...claim.querySelectorAll('.ch')].map(el => ({ el, x: 0, y: 0, w: BASE_W, g: BASE_G, tw: BASE_W, tg: BASE_G }));
    let radius = 200, px = -1e4, py = -1e4, raf = 0, wave = null;

    const measure = () => {
      letters.forEach(l => l.el.style.fontVariationSettings = '');
      const fs = parseFloat(getComputedStyle(claim).fontSize);
      radius = fs * 2.4;
      letters.forEach(l => {
        const r = l.el.getBoundingClientRect();
        l.x = r.left + r.width / 2 + window.scrollX;
        l.y = r.top + r.height / 2 + window.scrollY;
      });
      letters.forEach(l => paint(l));
    };
    const shape = (d) => {
      const x = d / radius;
      const core = Math.max(0, 1 - x / 0.55);
      const c = core * core * (3 - 2 * core);
      const ring = Math.exp(-Math.pow((x - 0.85) / 0.28, 2)) * (1 - c);
      return [BASE_W + 11 * c - 40 * ring, BASE_G + 100 * c - 180 * ring];
    };
    const paint = (l) => {
      l.el.style.fontVariationSettings = `"wdth" ${l.w.toFixed(1)}, "wght" ${Math.round(l.g)}`;
    };
    const step = (now) => {
      if (wave) {
        const t = Math.min(1, (now - wave.start) / wave.dur);
        const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        px = wave.x0 + (wave.x1 - wave.x0) * e;
        py = wave.y0 + (wave.y1 - wave.y0) * e;
        if (t === 1) { wave = null; px = py = -1e4; }
      }
      let moving = !!wave;
      letters.forEach(l => {
        [l.tw, l.tg] = shape(Math.hypot(l.x - px, (l.y - py) * 1.35));
        l.w += (l.tw - l.w) * 0.16;
        l.g += (l.tg - l.g) * 0.16;
        if (Math.abs(l.tw - l.w) > 0.05 || Math.abs(l.tg - l.g) > 0.5) moving = true;
        else { l.w = l.tw; l.g = l.tg; }
        paint(l);
      });
      raf = moving ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

    const ready = () => {
      measure();
      // The intro: one lens sweeps across both lines, on every device.
      const first = letters[0], last = letters[letters.length - 1];
      wave = { start: performance.now() + 650, dur: 1500,
               x0: first.x - radius, y0: first.y, x1: last.x + radius, y1: last.y };
      wave.start = performance.now() + 650;
      setTimeout(kick, 650);
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(ready);
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });

    if (finePointer) {
      const heroEl = document.getElementById('hero');
      heroEl.addEventListener('pointermove', e => {
        if (wave) return;
        px = e.clientX + window.scrollX;
        py = e.clientY + window.scrollY;
        kick();
      });
      heroEl.addEventListener('pointerleave', () => { px = py = -1e4; kick(); });
    }
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
  const applyTheme = (next) => {
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncToggle();
  };
  // The new theme spreads from the toggle like spilled ink.
  toggle.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }
    const r = toggle.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-vt');
    const vt = document.startViewTransition(() => applyTheme(next));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    vt.finished.finally(() => root.classList.remove('theme-vt'));
  });
  systemDark.addEventListener('change', syncToggle);
  syncToggle();

  // ---- Scroll reveals: one observer, elements get .in once ----
  const phone = document.getElementById('contactPhone');
  if (phone) {
    const text = phone.textContent.trim();
    phone.setAttribute('aria-label', text);
    let n = 0;
    phone.innerHTML = [...text].map(ch => ch === ' '
      ? ' '
      : `<span class="d" aria-hidden="true" style="--n:${n++}">${ch}</span>`).join('');
  }
  const revealTargets = document.querySelectorAll('.h2, .work, .about-grid, .skill, .big-phone');
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    revealTargets.forEach(el => revealObs.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('in'));
  }

  // ---- Hero deck leans toward the pointer (fine pointers only) ----
  const deck = document.querySelector('.deck');
  const hero = document.getElementById('hero');
  if (deck && hero && finePointer && !reduceMotion) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const step = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      deck.style.setProperty('--ry', `${(cx * 7).toFixed(2)}deg`);
      deck.style.setProperty('--rx', `${(-cy * 5).toFixed(2)}deg`);
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    hero.addEventListener('pointermove', e => {
      const r = deck.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      kick();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

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
  const reduce = reduceMotion;

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

  // ---- Project viewer: the screenshot grows out of its tile ----
  const viewer = document.getElementById('viewer');
  const vImg = document.getElementById('viewerImg');
  const vTitle = document.getElementById('viewerTitle');
  const vType = document.getElementById('viewerType');
  const vDesc = document.getElementById('viewerDesc');
  const vLink = document.getElementById('viewerLink');
  let current = null, opener = null;

  const visible = () => items.filter(i => !i.hidden);
  const fill = (item) => {
    const img = item.querySelector('.work-shot img');
    vImg.src = img.currentSrc || img.src;
    vImg.alt = img.alt;
    vImg.width = img.naturalWidth || img.width;
    vImg.height = img.naturalHeight || img.height;
    vTitle.textContent = item.querySelector('.work-title').textContent;
    vType.textContent = item.querySelector('.work-type').textContent;
    vDesc.textContent = item.querySelector('.work-desc').textContent;
    const link = item.querySelector('.work-link');
    vLink.href = link.href;
    vLink.textContent = `Otvoriť ${link.textContent.trim()}`;
    current = item;
  };
  const morph = (update, from) => {
    if (!document.startViewTransition || reduceMotion) { update(); return Promise.resolve(); }
    if (from) from.style.viewTransitionName = 'shot';
    const vt = document.startViewTransition(() => {
      if (from) from.style.viewTransitionName = '';
      update();
    });
    return vt.finished.finally(() => {
      vImg.style.viewTransitionName = '';
      current && (current.querySelector('.work-shot img').style.viewTransitionName = '');
    });
  };
  const openViewer = (item) => {
    opener = document.activeElement;
    const tileImg = item.querySelector('.work-shot img');
    morph(() => {
      fill(item);
      vImg.style.viewTransitionName = 'shot';
      viewer.showModal();
      document.documentElement.style.overflow = 'hidden';
    }, tileImg);
  };
  const closeViewer = () => {
    if (!viewer.open) return;
    const tileImg = current.querySelector('.work-shot img');
    morph(() => {
      viewer.close();
      document.documentElement.style.overflow = '';
      tileImg.style.viewTransitionName = 'shot';
    }, vImg).then(() => { opener && opener.focus({ preventScroll: true }); });
  };
  const go = (dir) => {
    const list = visible();
    const next = list[(list.indexOf(current) + dir + list.length) % list.length];
    if (reduceMotion || !vImg.animate) { fill(next); return; }
    vImg.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 24}px)` }],
      { duration: 160, easing: 'ease-in' }).finished.then(() => {
        fill(next);
        vImg.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
      });
  };
  items.forEach(item => {
    item.querySelector('.work-shot').addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      openViewer(item);
    });
  });
  document.getElementById('viewerClose').addEventListener('click', closeViewer);
  document.getElementById('viewerPrev').addEventListener('click', () => go(-1));
  document.getElementById('viewerNext').addEventListener('click', () => go(1));
  viewer.addEventListener('cancel', e => { e.preventDefault(); closeViewer(); });
  viewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });

  // ---- This page, measured in the visitor's own browser ----
  const built = document.getElementById('tento-web');
  const fmt = (n, d) => n.toLocaleString('sk-SK', { minimumFractionDigits: d, maximumFractionDigits: d });
  if (built && 'performance' in window && performance.getEntriesByType) {
    const fillBuilt = () => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource');
      const bytes = [nav, ...res].reduce((sum, e) => sum + (e ? (e.transferSize || e.encodedBodySize || 0) : 0), 0);
      const ms = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : 0;
      if (!bytes || !ms) return;
      document.getElementById('builtTime').textContent = ms < 1000 ? `${fmt(ms / 1000, 2)} s` : `${fmt(ms / 1000, 1)} s`;
      document.getElementById('builtSize').textContent = bytes < 1048576 ? `${Math.round(bytes / 1024)} kB` : `${fmt(bytes / 1048576, 1)} MB`;
      document.getElementById('builtLive').hidden = false;
    };
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      if (document.readyState === 'complete') fillBuilt(); else window.addEventListener('load', fillBuilt);
    }, { rootMargin: '0px 0px 25% 0px' }).observe(built);
  }

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

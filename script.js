// ---- NAVBAR SCROLL + BACK TO TOP ----
const navbar = document.getElementById('navbar');
const backToTopFixed = document.getElementById('backToTopFixed');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  backToTopFixed.classList.toggle('visible', window.scrollY > 300);
});

// ---- CUSTOM CURSOR ----
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');

let mouseX = -100, mouseY = -100;
let cursorX = -100, cursorY = -100;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
  cursor.classList.add('active');
  cursorDot.classList.add('active');
});

document.addEventListener('mouseleave', () => {
  cursor.classList.remove('active');
  cursorDot.classList.remove('active');
});

// Smooth cursor follow
(function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.1;
  cursorY += (mouseY - cursorY) * 0.1;
  cursor.style.left = cursorX + 'px';
  cursor.style.top  = cursorY + 'px';
  requestAnimationFrame(animateCursor);
})();

// Hover expand
document.querySelectorAll('a, button, .project-item, .skill-row').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
});

// ---- HERO CANVAS - Floating dots ----
const canvas  = document.getElementById('heroCanvas');
const ctx     = canvas.getContext('2d');

let W, H, particles;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

class Particle {
  constructor() { this.reset(true); }

  reset(initial) {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 2 + 0.6;
    this.vx = (Math.random() - 0.5) * 0.28;
    this.vy = (Math.random() - 0.5) * 0.28;
    this.a  = Math.random() * 0.65 + 0.25;
    this.life    = initial ? Math.floor(Math.random() * 400) : 0;
    this.maxLife = Math.random() * 500 + 300;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;

    // Wrap around screen edges — never disappear
    if (this.x < -5)  this.x = W + 5;
    if (this.x > W+5) this.x = -5;
    if (this.y < -5)  this.y = H + 5;
    if (this.y > H+5) this.y = -5;

    if (this.life > this.maxLife) this.reset(false);
  }

  draw() {
    const progress = this.life / this.maxLife;
    const fade = progress < 0.15
      ? progress / 0.15
      : progress > 0.8
        ? 1 - (progress - 0.8) / 0.2
        : 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(109,129,150,${this.a * fade})`;
    ctx.fill();
  }
}

function initParticles() {
  particles = Array.from({ length: 130 }, () => new Particle());
}

// Mouse repel - works across full page
let mx = -999, my = -999;
document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
});
document.addEventListener('mouseleave', () => { mx = -999; my = -999; });

function loop() {
  ctx.clearRect(0, 0, W, H);

  // Draw faint connecting lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(109,129,150,${(1 - dist / 100) * 0.1})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }

  particles.forEach(p => {
    // Mouse repel
    const dx = p.x - mx;
    const dy = p.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      const force = (100 - dist) / 100;
      p.x += (dx / dist) * force * 1.5;
      p.y += (dy / dist) * force * 1.5;
    }
    p.update();
    p.draw();
  });

  requestAnimationFrame(loop);
}

resize();
initParticles();
loop();
window.addEventListener('resize', () => { resize(); });

// ---- HAMBURGER ----
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ---- PROJECT FILTER ----
const filterBtns  = document.querySelectorAll('.filter-btn');
const projectItems = document.querySelectorAll('.project-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    projectItems.forEach((item, i) => {
      const match = filter === 'all' || item.dataset.category === filter;
      item.classList.toggle('hidden', !match);

      if (match) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(8px)';
        setTimeout(() => {
          item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        }, i * 40);
      }
    });

    // Re-number
    let count = 1;
    document.querySelectorAll('.project-item:not(.hidden) .project-num').forEach(num => {
      num.textContent = count.toString().padStart(2, '0');
      count++;
    });
  });
});

// ---- CONTACT FORM ----
function handleFormSubmit(e) {
  e.preventDefault();
  const btn      = document.getElementById('formSubmitBtn');
  const btnText  = document.getElementById('formBtnText');
  const successEl = document.getElementById('formSuccess');
  const form     = document.getElementById('contactForm');

  btn.disabled = true;
  btnText.textContent = 'Odosielam...';

  setTimeout(() => {
    btn.style.display = 'none';
    successEl.style.display = 'block';
    form.reset();
    setTimeout(() => {
      btn.style.display = 'inline-flex';
      btn.disabled = false;
      btnText.textContent = 'Odoslať správu';
      successEl.style.display = 'none';
    }, 5000);
  }, 1000);
}

// ---- ACTIVE NAV ----
const sections   = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link');

const navObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinkEls.forEach(link => {
        link.classList.toggle('active-link',
          link.getAttribute('href') === `#${entry.target.id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => navObs.observe(s));

const navStyle = document.createElement('style');
navStyle.textContent = `.nav-link.active-link { color: var(--txt) !important; }`;
document.head.appendChild(navStyle);

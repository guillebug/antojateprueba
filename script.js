// Nav scroll effect
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// Custom cursor
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cursor.style.left = mx+'px'; cursor.style.top = my+'px'; });
function animRing() { rx += (mx-rx)*0.12; ry += (my-ry)*0.12; ring.style.left = rx+'px'; ring.style.top = ry+'px'; requestAnimationFrame(animRing); }
animRing();
document.querySelectorAll('a, button, .feat-item, .gallery-item').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.classList.add('hover'); ring.classList.add('hover'); });
  el.addEventListener('mouseleave', () => { cursor.classList.remove('hover'); ring.classList.remove('hover'); });
});

// Scroll reveal
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ══════════════════════════════════════
// MODALES (beta Google Play + lista iOS)
// ══════════════════════════════════════

// Pega aquí la URL de tu formulario (por ejemplo, de Formspree:
// "https://formspree.io/f/xxxxxxx"). Mientras esté vacía, el formulario
// abre el correo del visitante con un mensaje listo para enviar.
const WAITLIST_ENDPOINT = '';
const WAITLIST_FALLBACK_EMAIL = 'hola.antojate@gmail.com';

let lastFocused = null;

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.hidden = false;
  modal.classList.remove('closing');
  document.body.classList.add('modal-open');
  const first = modal.querySelector('input[type="email"]:not([disabled])') || modal.querySelector('.modal-btn');
  setTimeout(() => first && first.focus(), 60);
}

function closeModal(modal) {
  if (!modal || modal.hidden) return;
  modal.classList.add('closing');
  setTimeout(() => {
    modal.hidden = true;
    modal.classList.remove('closing');
    if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
    if (lastFocused) lastFocused.focus();
  }, 200);
}

document.querySelectorAll('[data-modal-open]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    openModal(btn.dataset.modalOpen);
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', () => closeModal(modal));
  });
  // Mantener el foco dentro del modal con Tab
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const items = [...modal.querySelectorAll('button, input:not(.hp-field)')].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal(document.querySelector('.modal:not([hidden])'));
});

// Formulario de lista de espera iOS
const waitlistForm = document.getElementById('waitlist-form');
if (waitlistForm) {
  const input = waitlistForm.querySelector('input[type="email"]');
  const msg = document.getElementById('waitlist-msg');
  const submitBtn = waitlistForm.querySelector('button[type="submit"]');
  const modal = waitlistForm.closest('.modal');
  const formWrap = modal.querySelector('.waitlist-form-wrap');
  const done = modal.querySelector('.waitlist-done');
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  input.addEventListener('input', () => { input.classList.remove('invalid'); msg.textContent = ''; });

  waitlistForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = input.value.trim();
    if (!emailOk(email)) {
      input.classList.add('invalid');
      msg.textContent = 'Revisa tu correo, parece que falta algo.';
      input.focus();
      return;
    }
    if (waitlistForm.querySelector('.hp-field').value) return; // bot

    // Sin servicio configurado: abrir el correo del visitante
    if (!WAITLIST_ENDPOINT) {
      const subject = encodeURIComponent('Quiero Antójate en iOS');
      const body = encodeURIComponent('Hola, avísenme cuando Antójate esté disponible en iPhone.\nMi correo: ' + email);
      window.location.href = `mailto:${WAITLIST_FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, plataforma: 'iOS', origen: 'antojate.cl' })
      });
      if (!res.ok) throw new Error(res.status);
      formWrap.hidden = true;
      done.hidden = false;
      done.querySelector('.modal-btn').focus();
    } catch (err) {
      msg.textContent = 'No pudimos guardar tu correo. Inténtalo de nuevo en un momento.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Avísame';
    }
  });
}

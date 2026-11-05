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
// LISTA DE ESPERA (Android + iOS)
// Objetivo: guardar solo el correo para avisar cuando la app esté lista.
// ══════════════════════════════════════

// Los correos se envían a nuestra función en Vercel (carpeta /api),
// que los guarda en Brevo de forma segura.
// Si se deja vacío, el formulario abre el correo del visitante.
const WAITLIST_ENDPOINT = '/api/lista-espera';
const WAITLIST_FALLBACK_EMAIL = 'hola.antojate@gmail.com';

// Textos del modal según la tienda que se tocó
const TEXTOS_PLATAFORMA = {
  Android: {
    pill: 'Beta en curso',
    titulo: 'Muy pronto en <em>Google Play</em>',
    texto: 'Estamos en etapa beta. Déjanos tu correo y te avisamos apenas se habilite la descarga.',
    listo: 'Te avisaremos a tu correo apenas Antójate esté disponible en Google Play.'
  },
  iOS: {
    pill: 'Próximamente en iOS',
    titulo: '¿Usas <em>iPhone</em>?',
    texto: 'Estamos preparando la versión para iOS. Déjanos tu correo y te avisamos apenas esté disponible.',
    listo: 'Te avisaremos a tu correo apenas Antójate llegue al App Store.'
  }
};

let lastFocused = null;

function openModal(id, plataforma) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (plataforma && TEXTOS_PLATAFORMA[plataforma]) {
    const t = TEXTOS_PLATAFORMA[plataforma];
    modal.querySelectorAll('[data-texto]').forEach(el => { el.innerHTML = t[el.dataset.texto]; });
    const campo = modal.querySelector('#waitlist-plataforma');
    if (campo) campo.value = plataforma;
    // Volver a mostrar el formulario si antes se completó
    const wrap = modal.querySelector('.waitlist-form-wrap');
    const done = modal.querySelector('.waitlist-done');
    if (wrap && done) { wrap.hidden = false; done.hidden = true; }
    const msg = modal.querySelector('#waitlist-msg');
    if (msg) msg.textContent = '';
  }
  lastFocused = document.activeElement;
  modal.hidden = false;
  modal.classList.remove('closing');
  document.body.classList.add('modal-open');
  const first = modal.querySelector('input[type="email"]') || modal.querySelector('.modal-btn');
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
    openModal(btn.dataset.modalOpen, btn.dataset.plataforma);
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', () => closeModal(modal));
  });
  // Mantener el foco dentro del modal con Tab
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const items = [...modal.querySelectorAll('button, input:not(.hp-field):not([type="hidden"])')].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal(document.querySelector('.modal:not([hidden])'));
});

// Formulario de lista de espera
const waitlistForm = document.getElementById('waitlist-form');
if (waitlistForm) {
  const input = waitlistForm.querySelector('input[type="email"]');
  const plataformaInput = waitlistForm.querySelector('#waitlist-plataforma');
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
    const plataforma = plataformaInput.value;
    if (!emailOk(email)) {
      input.classList.add('invalid');
      msg.textContent = 'Revisa tu correo, parece que falta algo.';
      input.focus();
      return;
    }
    if (waitlistForm.querySelector('.hp-field').value) return; // bot

    // Sin servicio configurado: abrir el correo del visitante
    if (!WAITLIST_ENDPOINT) {
      const tienda = plataforma === 'iOS' ? 'iPhone (App Store)' : 'Android (Google Play)';
      const subject = encodeURIComponent('Avísenme cuando Antójate esté lista');
      const body = encodeURIComponent('Hola, avísenme cuando Antójate esté disponible en ' + tienda + '.\nMi correo: ' + email);
      window.location.href = `mailto:${WAITLIST_FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, plataforma })
      });
      if (res.status === 429) {
        msg.textContent = 'Hiciste varios intentos seguidos. Espera unos minutos y vuelve a intentarlo.';
        return;
      }
      if (!res.ok) throw new Error(res.status);
      input.value = '';
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

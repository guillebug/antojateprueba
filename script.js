// Nav scroll effect
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// Cómo funciona: cambia la pantalla del teléfono según el paso visible
const flow = document.querySelector('.flow');
if (flow) {
  const pasos = flow.querySelectorAll('.flow-step');
  const obsPasos = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        pasos.forEach(p => p.classList.remove('is-active'));
        e.target.classList.add('is-active', 'ya-visto');
        flow.dataset.active = e.target.dataset.step;
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  pasos.forEach(p => obsPasos.observe(p));
  pasos[0].classList.add('is-active');
}

// Scroll reveal
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ══════════════════════════════════════
// LISTA DE ESPERA (Android + iOS)
// Objetivo: guardar solo el correo para avisar cuando la app esté lista.
// Hay 3 formas de inscribirse: el formulario de la portada,
// los botones de las tiendas y la barra fija en celular.
// ══════════════════════════════════════

// Los correos se envían a nuestra función en Vercel (carpeta /api),
// que los guarda en Brevo de forma segura.
// Si se deja vacío, el formulario abre el correo del visitante.
const WAITLIST_ENDPOINT = '/api/lista-espera';
const WAITLIST_FALLBACK_EMAIL = 'hola.antojate@gmail.com';

const TIENDA = { Android: 'Google Play', iOS: 'el App Store' };

// Textos del modal según la tienda elegida
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

// Recordar (solo en este navegador) si ya se inscribió o cerró la barra
const memoria = {
  leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Envía el correo. Devuelve 'ok', 'limite', 'error' o 'mailto'.
async function enviarALista(email, plataforma) {
  if (!WAITLIST_ENDPOINT) {
    const tienda = plataforma === 'iOS' ? 'iPhone (App Store)' : 'Android (Google Play)';
    const subject = encodeURIComponent('Avísenme cuando Antójate esté lista');
    const body = encodeURIComponent('Hola, avísenme cuando Antójate esté disponible en ' + tienda + '.\nMi correo: ' + email);
    window.location.href = `mailto:${WAITLIST_FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
    return 'mailto';
  }
  try {
    const res = await fetch(WAITLIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, plataforma })
    });
    if (res.status === 429) return 'limite';
    return res.ok ? 'ok' : 'error';
  } catch (e) {
    return 'error';
  }
}

const MENSAJES = {
  invalido: 'Revisa tu correo, parece que falta algo.',
  limite: 'Hiciste varios intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  error: 'No pudimos guardar tu correo. Inténtalo de nuevo en un momento.'
};

// Conecta un formulario (portada o modal) con el envío
function conectarFormulario(form, alTerminar) {
  const input = form.querySelector('input[type="email"]');
  const msg = form.parentElement.querySelector('.lista-msg');
  const btn = form.querySelector('button[type="submit"]');
  const textoBtn = btn.innerHTML;
  input.addEventListener('input', () => { input.classList.remove('invalid'); if (msg) msg.textContent = ''; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = input.value.trim();
    const plataforma = (form.querySelector('input[name="plataforma"]:checked') || {}).value || 'Android';
    if (!emailOk(email)) {
      input.classList.add('invalid');
      if (msg) msg.textContent = MENSAJES.invalido;
      input.focus();
      return;
    }
    if (form.querySelector('.hp-field').value) return; // bot
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    const r = await enviarALista(email, plataforma);
    btn.disabled = false;
    btn.innerHTML = textoBtn;
    if (r === 'ok') {
      input.value = '';
      memoria.guardar('antojate_lista', plataforma);
      ocultarBarra();
      alTerminar(plataforma);
      document.dispatchEvent(new CustomEvent('lista:inscrito', { detail: plataforma }));
    } else if (r !== 'mailto' && msg) {
      msg.textContent = MENSAJES[r];
    }
  });
}

// ── Formulario de la portada
const heroForm = document.getElementById('unirme');
if (heroForm) {
  const done = heroForm.parentElement.querySelector('.hero-form-done');
  const mostrarListo = plataforma => {
    done.querySelector('[data-tienda]').textContent = TIENDA[plataforma] || 'Google Play';
    heroForm.hidden = true;
    done.hidden = false;
  };
  conectarFormulario(heroForm, mostrarListo);
  // Si se inscribió desde otro lugar (modal o barra), la portada también lo muestra
  document.addEventListener('lista:inscrito', e => mostrarListo(e.detail));
  const ya = memoria.leer('antojate_lista');
  if (ya) mostrarListo(ya);
}

// El botón de arriba lleva al formulario de la portada
document.querySelectorAll('[data-ir-formulario]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const campo = document.getElementById('hero-email');
    if (campo && !heroForm.hidden) setTimeout(() => campo.focus({ preventScroll: true }), 450);
  });
});

// ── Modal (botones de las tiendas y barra del celular)
let lastFocused = null;
const modalLista = document.getElementById('modal-lista');

function aplicarTextos(modal, plataforma) {
  const t = TEXTOS_PLATAFORMA[plataforma] || TEXTOS_PLATAFORMA.Android;
  modal.querySelectorAll('[data-texto]').forEach(el => { el.innerHTML = t[el.dataset.texto]; });
}

function openModal(id, plataforma) {
  const modal = document.getElementById(id);
  if (!modal) return;
  plataforma = TEXTOS_PLATAFORMA[plataforma] ? plataforma : 'Android';
  const radio = modal.querySelector(`input[name="plataforma"][value="${plataforma}"]`);
  if (radio) radio.checked = true;
  aplicarTextos(modal, plataforma);
  const wrap = modal.querySelector('.waitlist-form-wrap');
  const done = modal.querySelector('.waitlist-done');
  if (wrap && done) { wrap.hidden = false; done.hidden = true; }
  const msg = modal.querySelector('.lista-msg');
  if (msg) msg.textContent = '';
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
  // Al cambiar Android/iPhone dentro del modal, cambian los textos
  modal.querySelectorAll('input[name="plataforma"]').forEach(r => {
    r.addEventListener('change', () => aplicarTextos(modal, r.value));
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

const modalForm = document.getElementById('waitlist-form');
if (modalForm && modalLista) {
  conectarFormulario(modalForm, plataforma => {
    aplicarTextos(modalLista, plataforma);
    modalLista.querySelector('.waitlist-form-wrap').hidden = true;
    const done = modalLista.querySelector('.waitlist-done');
    done.hidden = false;
    done.querySelector('.modal-btn').focus();
  });
}

// ── Barra fija en celular: aparece al pasar la portada
const barra = document.querySelector('.beta-bar');
let heroVisible = true, finalVisible = false;

function ocultarBarra() {
  if (barra) barra.classList.remove('is-visible');
}
function actualizarBarra() {
  if (!barra) return;
  const descartada = memoria.leer('antojate_barra_cerrada') || memoria.leer('antojate_lista');
  const mostrar = !descartada && !heroVisible && !finalVisible;
  barra.hidden = false;
  barra.classList.toggle('is-visible', mostrar);
}
if (barra) {
  const hero = document.querySelector('.hero');
  const final = document.getElementById('descargar');
  const obsBarra = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.target === hero) heroVisible = e.isIntersecting;
      if (e.target === final) finalVisible = e.isIntersecting;
    });
    actualizarBarra();
  });
  if (hero) obsBarra.observe(hero);
  if (final) obsBarra.observe(final);
  barra.querySelector('.beta-bar-close').addEventListener('click', () => {
    memoria.guardar('antojate_barra_cerrada', '1');
    ocultarBarra();
  });
}

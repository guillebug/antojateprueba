// ══════════════════════════════════════════════════════════════
// Lista de espera de Antójate → Brevo
// Esta función corre en el servidor de Vercel, NO en el navegador.
// La clave de Brevo vive en las variables de entorno de Vercel,
// así que nunca queda visible en el código de la página.
//
// Variables de entorno necesarias (Vercel → Settings → Environment Variables):
//   BREVO_API_KEY          Clave API de Brevo
//   BREVO_LISTA_ANDROID    ID de la lista "Lista de espera Android"
//   BREVO_LISTA_IOS        ID de la lista "Lista de espera iOS"
// ══════════════════════════════════════════════════════════════

const ORIGENES_PERMITIDOS = [
  'https://antojate.cl',
  'https://www.antojate.cl',
];

// Límite simple de envíos por IP (por instancia del servidor)
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_POR_VENTANA = 5;
const intentos = new Map();

function demasiadosIntentos(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  lista.push(ahora);
  intentos.set(ip, lista);
  if (intentos.size > 5000) intentos.clear();
  return lista.length > MAX_POR_VENTANA;
}

const emailValido = e =>
  typeof e === 'string' &&
  e.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

module.exports = async function handler(req, res) {
  const origen = req.headers.origin || '';
  const origenOk = ORIGENES_PERMITIDOS.includes(origen) || origen.endsWith('.vercel.app');
  if (origenOk) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!origenOk) return res.status(403).json({ ok: false });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  if (demasiadosIntentos(ip)) return res.status(429).json({ ok: false, error: 'demasiados_intentos' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Trampa para bots: si el campo oculto viene lleno, fingimos éxito
  if (body._gotcha) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  const plataforma = body.plataforma === 'iOS' ? 'iOS' : body.plataforma === 'Android' ? 'Android' : null;
  if (!emailValido(email) || !plataforma) {
    return res.status(400).json({ ok: false, error: 'datos_invalidos' });
  }

  const { BREVO_API_KEY, BREVO_LISTA_ANDROID, BREVO_LISTA_IOS } = process.env;
  if (!BREVO_API_KEY || !BREVO_LISTA_ANDROID || !BREVO_LISTA_IOS) {
    console.error('Faltan variables de entorno de Brevo');
    return res.status(500).json({ ok: false, error: 'configuracion' });
  }

  const listaId = Number(plataforma === 'iOS' ? BREVO_LISTA_IOS : BREVO_LISTA_ANDROID);

  try {
    // Crea el contacto y lo agrega a la lista. Si ya existía,
    // updateEnabled lo agrega también a esta lista (sin borrar nada).
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [listaId],
        updateEnabled: true,
      }),
    });

    if (r.ok) return res.status(200).json({ ok: true });

    const detalle = await r.text();
    // Si el correo ya estaba registrado, respondemos igual que un éxito
    // (así nadie puede averiguar qué correos están en la lista).
    if (r.status === 400 && /duplicate|already/i.test(detalle)) {
      return res.status(200).json({ ok: true });
    }
    console.error('Error de Brevo', r.status, detalle);
    return res.status(502).json({ ok: false });
  } catch (err) {
    console.error('No se pudo conectar con Brevo', err);
    return res.status(502).json({ ok: false });
  }
};

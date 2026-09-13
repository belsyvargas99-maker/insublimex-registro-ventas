// Servidor de INSUBLIMEX · Registro de Ventas.
// - /api/public/*  → portal del cliente (sin sesión, con límite por IP)
// - /api/admin/*   → panel de las asesoras (clave ADMIN_PIN)
// Todo se escribe en la hoja de Google y en Drive con la cuenta de servicio (server/google.ts).

import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initGoogle, getGoogleConfig, checkAccess, isGoogleConfigured } from './server/google';
import {
  ASESORAS,
  ValidationError,
  registerSale,
  getRecords,
  setRecordStatus,
  todayInVenezuela,
  flushPending,
  pendingCount,
  prepareSheet,
} from './server/sales';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
// Secreto para firmar las sesiones del panel. Si no se define, se genera uno al
// arrancar (las sesiones se invalidan al reiniciar, que es aceptable).
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.set('trust proxy', 1); // detrás de Traefik en el VPS
app.disable('x-powered-by');

// Cabeceras de seguridad básicas (sin dependencia externa)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '10mb' })); // la imagen del comprobante viaja en base64
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ───────────────────────── sesiones del panel ─────────────────────────

const SESSION_MS = 12 * 60 * 60 * 1000;

// Token firmado con HMAC: "<expira>.<firma>". No hay estado en memoria, así que
// sobrevive reinicios del contenedor y funciona con varias réplicas.
function issueSession(): string {
  const exp = String(Date.now() + SESSION_MS);
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(exp).digest('base64url');
  return `${exp}.${sig}`;
}

function verifySession(token: string): boolean {
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(exp).digest('base64url');
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = String(req.headers['x-admin-token'] || '');
  if (!token || !verifySession(token)) {
    return res.status(401).json({ success: false, error: 'Sesión no válida. Vuelve a ingresar la clave.' });
  }
  next();
}

// ───────────────────────── límite por IP (portal público) ─────────────────────────

const hits = new Map<string, number[]>();
function rateLimit(max: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ success: false, error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' });
    }
    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}

const handleError = (res: express.Response, err: any) => {
  if (err instanceof ValidationError) return res.status(422).json({ success: false, error: err.message });
  console.error(err);
  return res.status(500).json({ success: false, error: 'Error interno. Intenta de nuevo en un momento.' });
};

// ───────────────────────── público ─────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    google: isGoogleConfigured(),
    pending: pendingCount(),
  });
});

app.get('/api/public/purchase-date', (req, res) => {
  res.json({ purchaseDate: todayInVenezuela(), timezone: 'America/Caracas', asesoras: ASESORAS });
});

app.post('/api/public/submit-sale', rateLimit(8, 10 * 60 * 1000), async (req, res) => {
  try {
    const { record, queued } = await registerSale(req.body || {}, 'portal-cliente');
    console.log(`[Portal] ${record.id} · ${record.customerName} · ${record.productName} · $${record.totalAmount}${queued ? ' (EN COLA)' : ''}`);
    res.status(201).json({
      success: true,
      message: '¡Listo! Tu pago quedó registrado. Guarda tu número de comprobante.',
      receiptId: record.id,
      timestamp: new Date().toISOString(),
      purchaseDate: record.purchaseDate,
      data: {
        customerName: record.customerName,
        cedula: record.cedula,
        asesora: record.asesora,
        productName: record.productName,
        quantity: record.quantity,
        totalAmount: record.totalAmount,
        paymentMethod: record.paymentMethod,
        paymentType: record.paymentType,
        paymentReference: record.paymentReference,
        estado: record.estado,
        ciudad: record.ciudad,
        direccion: record.direccion,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ───────────────────────── panel de asesoras ─────────────────────────

app.post('/api/admin/login', rateLimit(6, 15 * 60 * 1000), (req, res) => {
  const pin = String(req.body?.pin || '').slice(0, 200);
  if (!ADMIN_PIN || ADMIN_PIN.length < 8) {
    return res.status(503).json({ success: false, error: 'El servidor no tiene una ADMIN_PIN válida (mínimo 8 caracteres).' });
  }
  const a = crypto.createHash('sha256').update(pin).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PIN).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    console.warn(`[Seguridad] Clave incorrecta desde ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Clave incorrecta.' });
  }
  res.json({ success: true, token: issueSession() });
});

app.get('/api/admin/config', requireAdmin, (req, res) => {
  const cfg = getGoogleConfig();
  res.json({
    google: isGoogleConfigured(),
    spreadsheetUrl: cfg ? `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}/edit` : '',
    sheetName: cfg?.sheetName || '',
    driveFolderUrl: cfg?.driveFolderId ? `https://drive.google.com/drive/folders/${cfg.driveFolderId}` : '',
    asesoras: ASESORAS,
    pending: pendingCount(),
  });
});

app.get('/api/admin/records', requireAdmin, async (req, res) => {
  try {
    const records = await getRecords(req.query.refresh === '1');
    res.json({ records, pending: pendingCount() });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/admin/records', requireAdmin, async (req, res) => {
  try {
    const { record, queued } = await registerSale(req.body || {}, 'panel-asesora');
    console.log(`[Panel] ${record.id} · ${record.asesora} · ${record.customerName} · $${record.totalAmount}${queued ? ' (EN COLA)' : ''}`);
    res.status(201).json({ success: true, record, queued });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/admin/records/:id/status', requireAdmin, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['Pendiente', 'Verificado', 'Completado'].includes(status)) {
    return res.status(422).json({ success: false, error: 'Estado no válido.' });
  }
  try {
    const record = await setRecordStatus(req.params.id, status as any);
    res.json({ success: true, record });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/admin/retry-pending', requireAdmin, async (req, res) => {
  await flushPending();
  res.json({ success: true, pending: pendingCount() });
});

// Fotos de comprobantes. El nombre lleva un token aleatorio de 72 bits: el enlace
// solo lo conoce quien tiene la fila de la hoja. Sin listado de directorio.
app.use('/comprobantes', express.static(UPLOADS_DIR, { index: false, maxAge: '30d', immutable: true }));
app.get('/comprobantes', (req, res) => res.status(404).end());

// ───────────────────────── arranque ─────────────────────────

async function startServer() {
  const g = initGoogle();
  if (g.ok) {
    console.log(`[Google] Cuenta de servicio: ${g.email}`);
    try {
      const cfg = getGoogleConfig()!;
      const info = await checkAccess(cfg);
      console.log(`[Google] Hoja: "${info.sheetTitle}" · pestaña "${cfg.sheetName}" · Carpeta Drive: ${info.folderName}`);
      await prepareSheet();
    } catch (err: any) {
      console.error(`[Google] La cuenta de servicio no puede acceder: ${err.message}`);
      console.error('        Comparte la hoja y la carpeta de Drive con el correo de la cuenta de servicio (permiso Editor).');
    }
  } else {
    console.warn(`[Google] NO configurado: ${g.reason} Las ventas se guardarán en data/pending.json hasta que se configure.`);
  }
  if (!ADMIN_PIN || ADMIN_PIN.length < 8) console.warn('[Seguridad] ADMIN_PIN ausente o muy corta (mínimo 8): el panel no permitirá entrar.');
  if (!process.env.SESSION_SECRET) console.warn('[Seguridad] SESSION_SECRET no definido: las sesiones del panel se cierran al reiniciar.');
  if (!ASESORAS.length) console.warn('[Config] ASESORAS vacío: el formulario no tendrá asesoras para elegir.');

  await flushPending();
  setInterval(() => flushPending().catch(() => {}), 60_000);

  if (!IS_PROD) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1h', index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`INSUBLIMEX Registro de Ventas escuchando en http://0.0.0.0:${PORT} (${IS_PROD ? 'producción' : 'desarrollo'})`);
  });
}

startServer();

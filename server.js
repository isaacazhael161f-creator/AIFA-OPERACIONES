// Simple static server for AIFA-OPERACIONES to avoid file:// CORS issues
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const fsp = fs.promises;

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname);
const DEV = process.env.NODE_ENV !== 'production';
const DATA_DIR = path.join(ROOT, 'data');
const CUSTOM_PARTE_FILE = path.join(DATA_DIR, 'custom_parte_operaciones.json');
const CUSTOM_STORE_DEFAULT = { dates: {}, updatedAt: null, version: 0 };

function createDefaultStore() {
  return { dates: {}, updatedAt: null, version: 0 };
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeCustomEntry(entry) {
  const safeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };
  const tipo = (entry?.tipo || 'Sin clasificar').toString().trim();
  const llegada = safeNumber(entry?.llegada);
  const salida = safeNumber(entry?.salida);
  let subtotal = safeNumber(entry?.subtotal);
  if (!subtotal) subtotal = llegada + salida;
  return { tipo, llegada, salida, subtotal };
}

async function readCustomStore() {
  try {
    const raw = await fsp.readFile(CUSTOM_PARTE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createDefaultStore();
    return {
      dates: parsed.dates && typeof parsed.dates === 'object' ? parsed.dates : {},
      updatedAt: parsed.updatedAt || null,
      version: Number.isFinite(parsed.version) ? parsed.version : 0
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return createDefaultStore();
    }
    throw err;
  }
}

async function writeCustomStore(store) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(store, null, 2);
  await fsp.writeFile(CUSTOM_PARTE_FILE, payload, 'utf8');
}

// Enable CORS for local development (optional but handy)
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Helpful headers for local PDFs and static assets
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// During development, block serving files from /www to avoid duplicate HTML/CSS/JS paths
if (DEV) {
  app.use('/www', (req, res) => {
    res.status(410).send('www folder disabled in development. Use root files only.');
  });
}

const api = express.Router();

app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(ROOT, 'manifest.webmanifest'));
});

api.get('/parte-operaciones/custom', async (req, res) => {
  try {
    const store = await readCustomStore();
    const { date } = req.query || {};
    if (date && isIsoDate(date)) {
      return res.json({ date, entries: store.dates?.[date] || [] });
    }
    return res.json({ dates: store.dates || {}, updatedAt: store.updatedAt, version: store.version });
  } catch (err) {
    console.error('GET /parte-operaciones/custom failed', err);
    res.status(500).json({ error: 'No se pudo consultar el registro' });
  }
});

api.post('/parte-operaciones/custom', async (req, res) => {
  try {
    const { date, entries } = req.body || {};
    if (!isIsoDate(date)) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Formato de entradas inválido' });
    }
    if (entries.length > 80) {
      return res.status(413).json({ error: 'Demasiadas filas. Limite 80 por día.' });
    }
    const sanitized = entries.map(sanitizeCustomEntry).filter((item) => item.tipo);
    const store = await readCustomStore();
    store.dates = store.dates || {};
    store.dates[date] = sanitized;
    store.updatedAt = new Date().toISOString();
    store.version = Number.isFinite(store.version) ? store.version + 1 : 1;
    await writeCustomStore(store);
    res.json({ ok: true, store: { dates: store.dates, updatedAt: store.updatedAt, version: store.version } });
  } catch (err) {
    console.error('POST /parte-operaciones/custom failed', err);
    res.status(500).json({ error: 'No se pudo guardar la captura' });
  }
});

api.delete('/parte-operaciones/custom/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!isIsoDate(date)) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }
    const store = await readCustomStore();
    if (store.dates && store.dates[date]) {
      delete store.dates[date];
      store.updatedAt = new Date().toISOString();
      store.version = Number.isFinite(store.version) ? store.version + 1 : 1;
      await writeCustomStore(store);
    }
    res.json({ ok: true, store: { dates: store.dates || {}, updatedAt: store.updatedAt, version: store.version } });
  } catch (err) {
    console.error('DELETE /parte-operaciones/custom/:date failed', err);
    res.status(500).json({ error: 'No se pudo eliminar la captura' });
  }
});

app.use('/api', api);

// Serve all static files from the repository root
app.use(express.static(ROOT, { index: 'index.html' }));

// Fallback for SPA routes: use a generic middleware (avoids path-to-regexp issues on Express 5)
app.use((req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AIFA-OPERACIONES dev server running at http://localhost:${PORT}`);
});

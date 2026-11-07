const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(path.join(DATA_DIR, 'tienda.db'));
sqlite.pragma('journal_mode = WAL');

const cloudUrl = process.env.SUPABASE_DB_URL || '';
const pool = cloudUrl
  ? new Pool({
      connectionString: cloudUrl,
      ssl: /supabase|sslmode=require/i.test(cloudUrl) ? { rejectUnauthorized: false } : undefined,
      max: 5,
      connectionTimeoutMillis: 5000
    })
  : null;

let cloudUp = Boolean(pool);
let timer = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    iva INTEGER NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL,
    card_last4 TEXT,
    transaction_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    qty INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    sql TEXT NOT NULL,
    params TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id)`
];

const connectionCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '57P01',
  '57P02',
  '57P03',
  '08000',
  '08003',
  '08006'
]);

function isConnectionError(error) {
  if (!error) return false;
  if (connectionCodes.has(error.code)) return true;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('terminated') ||
    message.includes('econn') ||
    message.includes('enotfound') ||
    message.includes('connect')
  );
}

function toSqlite(sql, params = []) {
  const ordered = [];
  const text = sql.replace(/\$(\d+)/g, (_, number) => {
    ordered.push(params[Number(number) - 1]);
    return '?';
  });
  return { text, params: ordered };
}

function enqueue(sql, params) {
  sqlite
    .prepare('INSERT INTO sync_queue (id, sql, params, created_at) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), sql, JSON.stringify(params), new Date().toISOString());
}

async function createCloudSchema() {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }
}

async function init() {
  for (const statement of schemaStatements) {
    sqlite.prepare(statement).run();
  }

  if (!pool) {
    console.warn('[db] SUPABASE_DB_URL no configurada. Se usa SQLite local y cola de sincronización.');
    return;
  }

  try {
    await createCloudSchema();
    cloudUp = true;
    console.log('[db] Supabase conectado.');
    await flushQueue();
  } catch (error) {
    cloudUp = false;
    console.warn('[db] Supabase no disponible al iniciar. Se usa SQLite:', error.message);
  }

  timer = setInterval(checkCloud, 30000);
  timer.unref?.();
}

async function checkCloud() {
  if (!pool) return;

  try {
    await pool.query('SELECT 1');
    const wasDown = !cloudUp;

    if (wasDown) {
      await createCloudSchema();
    }

    cloudUp = true;

    if (wasDown) {
      console.log('[db] Supabase recuperado. Sincronizando cola...');
      await flushQueue();
    }
  } catch (error) {
    if (cloudUp) {
      console.warn('[db] Supabase caído. Se usa SQLite local.');
    }
    cloudUp = false;
  }
}

async function write(sql, params = []) {
  const local = toSqlite(sql, params);
  sqlite.prepare(local.text).run(local.params);

  if (pool && cloudUp) {
    try {
      await pool.query(sql, params);
      return 'cloud';
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      cloudUp = false;
      console.warn('[db] Escritura en Supabase falló. Se encola para sincronizar:', error.message);
    }
  }

  enqueue(sql, params);
  return 'local';
}

async function read(sql, params = []) {
  if (pool && cloudUp) {
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      cloudUp = false;
      console.warn('[db] Lectura en Supabase falló. Se usa SQLite:', error.message);
    }
  }

  const local = toSqlite(sql, params);
  return sqlite.prepare(local.text).all(local.params);
}

async function flushQueue() {
  const rows = sqlite.prepare('SELECT * FROM sync_queue ORDER BY created_at ASC').all();

  for (const row of rows) {
    try {
      await pool.query(row.sql, JSON.parse(row.params));
      sqlite.prepare('DELETE FROM sync_queue WHERE id = ?').run(row.id);
    } catch (error) {
      if (error.code === '23505') {
        sqlite.prepare('DELETE FROM sync_queue WHERE id = ?').run(row.id);
        continue;
      }
      console.warn('[db] No se pudo sincronizar una operación:', error.message);
      if (isConnectionError(error)) {
        cloudUp = false;
        break;
      }
    }
  }
}

module.exports = {
  init,
  read,
  write,
  randomUUID,
  cloudState: () => cloudUp
};

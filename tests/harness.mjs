import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url, child, logs, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`El servicio terminó antes de estar listo: ${url}\n${logs.join('')}`);
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // El servicio todavía no escucha.
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Timeout esperando ${url}\n${logs.join('')}`);
}

function startService(name, dir, port, env) {
  const logs = [];
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(root, dir),
    env: { ...process.env, PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => logs.push(`[${name}] ${chunk}`));
  child.stderr.on('data', (chunk) => logs.push(`[${name}] ${chunk}`));

  return { name, child, logs };
}

async function stopService(service) {
  const { child } = service;
  if (child.exitCode !== null) return;

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 3000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

export async function startStack() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tienda-tests-'));
  const [ivaPort, pdfPort, webPort] = await Promise.all([
    freePort(),
    freePort(),
    freePort()
  ]);

  const iva = startService('ms-iva', 'services/iva', ivaPort, {
    IVA_RATE: '0.19'
  });
  const pdf = startService('ms-pdf', 'services/pdf', pdfPort, {});
  const web = startService('tienda-web', 'web', webPort, {
    DATA_DIR: dataDir,
    JWT_SECRET: 'test-secret-solo-para-pruebas',
    IVA_URL: `http://127.0.0.1:${ivaPort}`,
    PDF_URL: `http://127.0.0.1:${pdfPort}`,
    SUPABASE_DB_URL: ''
  });

  const services = [iva, pdf, web];

  try {
    await Promise.all([
      waitFor(`http://127.0.0.1:${ivaPort}/health`, iva.child, iva.logs),
      waitFor(`http://127.0.0.1:${pdfPort}/health`, pdf.child, pdf.logs),
      waitFor(`http://127.0.0.1:${webPort}/api/health`, web.child, web.logs)
    ]);
  } catch (error) {
    await Promise.all(services.map(stopService));
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw error;
  }

  return {
    baseUrl: `http://127.0.0.1:${webPort}`,
    ivaUrl: `http://127.0.0.1:${ivaPort}`,
    pdfUrl: `http://127.0.0.1:${pdfPort}`,
    async stop() {
      await Promise.all(services.map(stopService));
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

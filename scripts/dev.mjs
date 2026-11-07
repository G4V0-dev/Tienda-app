import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const services = [
  { name: 'ms-iva', dir: 'services/iva', port: 4001 },
  { name: 'ms-pdf', dir: 'services/pdf', port: 4002 },
  { name: 'tienda-web', dir: 'web', port: 3000 }
];

for (const service of services) {
  const cwd = path.join(root, service.dir);
  if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
    console.error(`[dev] Falta node_modules en ${service.dir}. Ejecuta: npm run install:all`);
    process.exit(1);
  }
}

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

services.forEach((service, index) => {
  setTimeout(() => {
    if (stopping) return;

    const cwd = path.join(root, service.dir);
    console.log(`[dev] Iniciando ${service.name} en http://localhost:${service.port}`);

    const child = spawn(process.execPath, ['src/server.js'], {
      cwd,
      stdio: 'inherit',
      env: process.env
    });

    child.on('error', (error) => {
      console.error(`[dev] No se pudo iniciar ${service.name}:`, error.message);
      stop(1);
    });

    child.on('exit', (code) => {
      if (!stopping) {
        console.error(`[dev] ${service.name} terminó con código ${code ?? 0}`);
        stop(code ?? 1);
      }
    });

    children.push(child);
  }, index * 700);
});

console.log('[dev] Ctrl+C para detener los tres servicios.');

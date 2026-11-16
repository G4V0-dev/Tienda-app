import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startStack } from './harness.mjs';

let stack;

before(async () => {
  stack = await startStack();
});

after(async () => {
  await stack?.stop();
});

const services = [
  {
    name: 'tienda-web',
    base: () => stack.baseUrl,
    title: 'Tienda Web API',
    paths: [
      '/api/health',
      '/api/products',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/me',
      '/api/checkout',
      '/api/orders/{id}',
      '/api/orders/{id}/receipt',
      '/api/admin/products',
      '/api/admin/products/{id}'
    ]
  },
  {
    name: 'ms-iva',
    base: () => stack.ivaUrl,
    title: 'ms-iva',
    paths: ['/health', '/calcular']
  },
  {
    name: 'ms-pdf',
    base: () => stack.pdfUrl,
    title: 'ms-pdf',
    paths: ['/health', '/comprobante']
  }
];

describe('Documentación OpenAPI', () => {
  for (const service of services) {
    it(`${service.name} publica el contrato y la UI de Swagger`, async () => {
      const specResponse = await fetch(`${service.base()}/openapi.json`);
      assert.equal(specResponse.status, 200);

      const spec = await specResponse.json();
      assert.match(spec.openapi, /^3\./);
      assert.equal(spec.info.title, service.title);
      assert.ok(spec.servers?.length, 'El contrato debe declarar al menos un servidor');

      for (const path of service.paths) {
        assert.ok(spec.paths?.[path], `Falta documentar ${path}`);
      }

      const docsResponse = await fetch(`${service.base()}/docs/`, { redirect: 'follow' });
      assert.equal(docsResponse.status, 200);
      assert.match(docsResponse.headers.get('content-type') || '', /text\/html/);
    });
  }
});

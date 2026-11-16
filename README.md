# Tienda Básica

Carrito de compras con autenticación JWT, roles (`admin`/`user`), catálogo administrable con stock, IVA 19%, pago simulado y comprobante PDF. Web en Express, app Expo y dos microservicios independientes.

## Arquitectura

```
App Expo / navegador
        │
        ▼
tienda-web :3000 ──► ms-iva :4001  (IVA y total)
   │        └─────► ms-pdf :4002  (comprobante PDF)
   ├──► Supabase Postgres (nube)
   └──► SQLite local (respaldo y cola de sincronización)
```

| Servicio | Carpeta | Responsabilidad | Docs |
| --- | --- | --- | --- |
| `tienda-web` | `web/` | Frontend, auth, carrito y órdenes | `/docs` |
| `ms-iva` | `services/iva/` | Calcula subtotal, IVA y total | `/docs` |
| `ms-pdf` | `services/pdf/` | Genera el comprobante PDF | `/docs` |

## Inicio rápido

Requiere Node.js 20 o superior. No necesitas Supabase: sin `SUPABASE_DB_URL` la app usa SQLite.

```bash
npm run install:all
npm run dev
```

- Web: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs> · <http://localhost:4001/docs> · <http://localhost:4002/docs>
- `Ctrl+C` detiene los tres servicios.

Datos de prueba: regístrate con cualquier correo y contraseña de 6+ caracteres; paga con `4242 4242 4242 4242`, `12/30`, CVV `123`.

## Panel de administración

Agrega tu correo a `web/.env` y reinicia los servicios:

```bash
ADMIN_EMAILS=admin@example.com
```

Regístrate con ese correo, entra a la tienda y pulsa **Panel admin**. Permite crear productos, editar nombre, precio, color y stock, y eliminar productos con borrado lógico. El stock se valida y descuenta en cada checkout. Detalles en [`docs/features/roles-admin.md`](docs/features/roles-admin.md).

## App móvil

Expo SDK 54 + Expo Router + TypeScript, mismo backend:

```bash
cd mobile
npm start
```

Si el teléfono no alcanza el backend, define `EXPO_PUBLIC_API_URL=http://TU_IP:3000` en `mobile/.env`. Detalles en [`mobile/README.md`](mobile/README.md).

## Estructura

```
web/              Express: rutas, SQLite/Supabase y frontend estático
services/iva/     Microservicio de IVA
services/pdf/     Microservicio de comprobante PDF
mobile/           App Expo
supabase/         schema.sql
tests/            API y microservicios (node:test)
tests/e2e/        Flujo web (Playwright)
scripts/          dev.mjs y smoke.mjs
```

## Variables de entorno

Cada servicio trae un `.env.example`; copia el que necesites a `.env`.

| Servicio | Variables |
| --- | --- |
| `tienda-web` | `PORT`, `JWT_SECRET`, `SUPABASE_DB_URL`, `IVA_URL`, `PDF_URL`, `CORS_ORIGIN`, `DATA_DIR`, `ADMIN_EMAILS` |
| `ms-iva` | `PORT`, `IVA_RATE` |
| `ms-pdf` | `PORT`, `COMPANY_NAME`, `COMPANY_NIT`, `COMPANY_ADDRESS`, `COMPANY_PHONE` |

Supabase: usa la URI del **Session pooler** terminada en `?sslmode=require`. Las tablas se crean al iniciar `tienda-web` o ejecutando [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor.

## Pruebas

| Comando | Cobertura |
| --- | --- |
| `npm test` | API, roles, admin, stock, IVA, PDF y contratos OpenAPI |
| `npm run test:mobile` | Lógica y componentes de la app Expo |
| `npm run test:e2e` | Compra, PDF y panel de administración con Playwright |
| `npm run test:all` | Las tres suites |

La primera vez: `npx playwright install chromium`. Para verificar un despliegue: `BASE_URL=https://tu-web.onrender.com npm run smoke`.

## Documentación

- [Referencia de API](docs/api.md): endpoints, roles, admin, autenticación y errores.
- [Roles y administración](docs/features/roles-admin.md): alcance, reglas, casos límite y matriz de pruebas.
- [Despliegue en Render](docs/deploy.md): blueprint en cinco pasos.
- Swagger interactivo: `/docs` en cada servicio; contrato en `/openapi.json`.

## Alcance y seguridad

- El pago es ficticio: no hay pasarela real ni cobro.
- Contraseñas con bcrypt; JWT firmado con `JWT_SECRET` y expiración de 7 días.
- Precios, cantidades, IVA y stock se validan en el servidor; el cliente nunca fija precios ni roles.
- El panel admin usa borrado lógico: las órdenes históricas conservan nombre y precio del producto.
- Supabase se usa por conexión directa a Postgres; SQLite es el respaldo local y la cola de sincronización.
- Para producción real faltan pasarela de pago, verificación de correo, recuperación de contraseña y límites de tasa.

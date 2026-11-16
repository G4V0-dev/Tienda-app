# Roles, usuarios y administración de productos

**Estado:** implementado. Esta especificación describe el comportamiento actual y los aspectos que cubre.

## Objetivo

Incorporar roles sobre la autenticación JWT existente y dar a un administrador un panel para gestionar el catálogo y el stock, sin romper el flujo de compra web/móvil ni la arquitectura SQLite + Supabase.

## Alcance

Incluido:

- Registro de usuarios normales con rol `user`.
- Rol `admin` asignado al registrarse con un correo listado en `ADMIN_EMAILS`.
- Middleware de autorización para `/api/admin/*`.
- Catálogo persistido en base de datos con `stock` y borrado lógico (`active`).
- Panel web en la SPA: crear producto, editar nombre/descripción/precio/color/stock, eliminar y reactivar.
- Validación y descuento de stock en el checkout.
- Stock visible y cantidades limitadas en web y app Expo.
- Migración automática de tablas existentes y seed del catálogo inicial.

Fuera de alcance:

- Gestión de usuarios o cambio de roles desde la interfaz.
- Imágenes, tallas, variantes o códigos SKU.
- Auditoría de cambios, historial de stock o reservas.
- Pasarela de pago real, verificación de correo, 2FA o límites de tasa.
- Operación multi-instancia o multi-escritor: los IDs nuevos usan `MAX(id)+1` y la cola local-first asume un proceso por base.

## Modelo de datos

| Tabla | Campo | Tipo | Regla |
| --- | --- | --- | --- |
| `users` | `role` | TEXT | `admin` o `user`; por defecto `user` |
| `products` | `id` | INTEGER | PK estable; el seed usa 1–6 |
| `products` | `name` | TEXT | Obligatorio, máx. 80 caracteres |
| `products` | `description` | TEXT | Opcional, máx. 240 caracteres |
| `products` | `price` | INTEGER | COP entero entre 0 y 100000000 |
| `products` | `color` | TEXT | `#RRGGBB` |
| `products` | `stock` | INTEGER | 0–9999; se descuenta al pagar |
| `products` | `active` | INTEGER | `1` visible, `0` eliminado lógicamente |

`order_items` conserva `name` y `price` del momento de la compra, por lo que editar o desactivar un producto no altera órdenes históricas.

## Roles y permisos

| Acción | Visitante | `user` | `admin` |
| --- | --- | --- | --- |
| Ver catálogo y stock | Sí | Sí | Sí |
| Registrarse / iniciar sesión | Sí | — | — |
| Consultar sus órdenes y PDF | No | Sí | Sí |
| Comprar y descontar stock | No | Sí | Sí |
| Listar productos inactivos | No | No | Sí |
| Crear, editar, eliminar y reactivar | No | No | Sí |

## Autenticación y bootstrap

- `register` y `login` devuelven `{ token, user }` con `role`.
- El JWT incluye `role` y expira en 7 días.
- `/api/auth/me` consulta la base y devuelve el rol vigente.
- `/api/admin/*` verifica el rol **en la base de datos** en cada petición, no solo el JWT.
- El rol nunca se toma del cuerpo de la petición.
- `ADMIN_EMAILS` se lee al arrancar `tienda-web`; los correos se comparan sin distinguir mayúsculas.
- El rol admin se asigna **en el registro**. Para promover una cuenta ya existente hay que actualizar `users.role` en la base y volver a iniciar sesión; el panel usará el rol vigente sin esperar al siguiente login.
- Si se agrega un correo a `ADMIN_EMAILS` con el servidor corriendo, hay que reiniciar para que aplique.

## API

Contrato completo en [`docs/api.md`](../api.md) y Swagger en `/docs`.

| Método | Ruta | Rol | Función |
| --- | --- | --- | --- |
| GET | `/api/products` | — | Productos activos con stock |
| GET | `/api/auth/me` | JWT | Usuario y rol vigentes |
| GET | `/api/admin/products` | Admin | Todos, incluidos inactivos |
| POST | `/api/admin/products` | Admin | Crea producto |
| PUT | `/api/admin/products/{id}` | Admin | Actualización parcial |
| DELETE | `/api/admin/products/{id}` | Admin | Borrado lógico |

Códigos relevantes: `400` datos inválidos, `401` sin sesión, `403` sin rol admin, `404` producto inexistente, `409` stock insuficiente.

## Reglas de negocio

### Stock

1. El checkout recalcula precios y cantidades desde la base.
2. Si una línea supera `stock`, responde `409` con el nombre del producto y las unidades disponibles.
3. Antes de crear la orden descuenta con `UPDATE ... WHERE stock >= cantidad`.
4. Si el descuento de una línea falla, revierte las líneas ya descontadas y responde `409`.
5. La orden y sus ítems se guardan después del descuento.
6. El carrito web/móvil limita la cantidad al stock y elimina líneas de productos agotados o inactivos al recargar el catálogo.

### Eliminación

- `DELETE` solo marca `active=0`; no borra filas.
- El producto desaparece del catálogo público y no puede comprarse.
- Sigue visible en el panel con la etiqueta **Inactivo** y puede reactivarse con `active=1`.

### Validación

- Precio entero, no negativos, sin decimales.
- Stock entero entre 0 y 9999.
- Color hexadecimal de seis dígitos.
- Campos omitidos en `PUT` conservan su valor actual.

## Flujos

### Alta y primer administrador

1. Definir `ADMIN_EMAILS=admin@example.com` en `web/.env` o en Render.
2. Reiniciar `tienda-web`.
3. Registrarse con ese correo: la respuesta y `/me` devuelven `role: admin`.
4. Aparece el botón **Panel admin** en la barra superior.

### Compra con stock

1. El usuario agrega unidades; la UI no supera el stock.
2. El checkout valida stock y tarjeta.
3. Se descuenta el stock y se crea la orden.
4. Al volver al catálogo se refrescan precios, stock y carrito.

### Administración

1. El admin abre el panel y ve todos los productos.
2. Crea un producto: aparece en el catálogo público si `stock > 0` o aunque sea 0, pero sin poder comprarse.
3. Edita stock o precio: el catálogo se refresca al volver.
4. Elimina: el producto queda inactivo y puede reactivarse.

## Casos límite cubiertos

| Caso | Comportamiento |
| --- | --- |
| Stock 0 | Visible como **Agotado**; botón deshabilitado y checkout `409` |
| Cantidad mayor al stock | `409` con unidades disponibles |
| Stock cambia durante el pago | Descuento condicional; rollback y `409` |
| Producto inactivo en un carrito viejo | Se ignora o se elimina del carrito; no se compra |
| Dos compras simultáneas por la última unidad | Solo una descuenta; la otra recibe `409` |
| Rol enviado en el registro | Se ignora; el rol lo decide `ADMIN_EMAILS` |
| Usuario normal en `/api/admin/*` | `403` |
| Token sin usuario en la base | `401` en `/me` |
| Correo duplicado | `409`; no se duplica el usuario |
| Producto eliminado con órdenes | La orden conserva nombre y precio históricos |
| Supabase caído | Se escribe en SQLite y se encola la sincronización |
| Base existente sin `role` | Se agrega la columna con valor `user` al iniciar |
| Catálogo existente | El seed usa `ON CONFLICT DO NOTHING`; no pisa ediciones ni reactiva productos |
| Dos administradores crean productos a la vez | Los IDs `MAX(id)+1` pueden colisionar; el plan gratuito de Render usa una sola instancia |

## Migración y compatibilidad

- SQLite: `ALTER TABLE users ADD COLUMN role` solo si falta la columna.
- Supabase: verificación en `information_schema.columns` y `ALTER TABLE` equivalente.
- `products` se crea con `CREATE TABLE IF NOT EXISTS` y se siembra con los 6 productos y stock 500 si no existen.
- `supabase/schema.sql` refleja el esquema para instalaciones nuevas.
- La API mantiene las rutas y el formato de órdenes existentes; solo agrega `stock` al producto y `role` al usuario.

## Criterios de aceptación

- [x] Un registro normal obtiene `role: user` aunque envíe `role: admin`.
- [x] Un correo de `ADMIN_EMAILS` obtiene `role: admin`.
- [x] Rutas admin devuelven `401` sin token y `403` con rol `user`.
- [x] El admin crea, edita, desactiva y reactiva productos.
- [x] El catálogo público oculta inactivos y muestra stock.
- [x] El checkout rechaza y no descuenta stock insuficiente.
- [x] El checkout descuenta stock al aprobar el pago.
- [x] Web y móvil deshabilitan productos agotados.
- [x] Swagger documenta roles y endpoints admin.
- [x] Las pruebas de API, móvil y E2E pasan.

## Matriz de pruebas

| Nivel | Archivo | Cobertura |
| --- | --- | --- |
| API | `tests/roles-admin.test.mjs` | Roles, autorización, CRUD, validaciones, borrado lógico y stock |
| API | `tests/requirements.test.mjs` | Regresión de catálogo, auth, checkout, PDF e IVA |
| Contrato | `tests/api-docs.test.mjs` | `/docs`, `/openapi.json` y rutas admin documentadas |
| E2E | `tests/e2e/admin.spec.ts` | Panel: crear, stock, eliminar, reactivar y visibilidad por rol |
| E2E | `tests/e2e/purchase.spec.ts` | Compra y PDF con el catálogo en base de datos |
| Móvil | `mobile/__tests__/cart.test.ts` | Límite por stock, agotados y saneamiento del carrito |
| Móvil | `mobile/__tests__/components.test.tsx` | Stock visible y botón deshabilitado |

Comandos: `npm test`, `npm run test:e2e`, `npm run test:mobile`.

## Verificación manual

```bash
# Terminal 1
ADMIN_EMAILS=admin@example.com npm run dev

# Navegador
# http://localhost:3000 -> registrarse con admin@example.com -> Panel admin
```

## Próximos pasos sugeridos

1. Gestión de usuarios y roles desde el panel.
2. Historial de cambios de precio/stock y auditoría por administrador.
3. Imágenes y variantes (talla/color) por producto.
4. Reserva temporal de stock durante el checkout.
5. Límites de tasa y verificación de correo para producción.

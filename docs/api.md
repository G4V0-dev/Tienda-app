# Referencia de API

Cada servicio publica su contrato OpenAPI 3 y una UI interactiva:

| Servicio | Swagger UI | Contrato |
| --- | --- | --- |
| `tienda-web` | <http://localhost:3000/docs> | <http://localhost:3000/openapi.json> |
| `ms-iva` | <http://localhost:4001/docs> | <http://localhost:4001/openapi.json> |
| `ms-pdf` | <http://localhost:4002/docs> | <http://localhost:4002/openapi.json> |

En Render, reemplaza el host por el dominio de cada servicio. Usa **Authorize** en Swagger UI con el JWT para probar las rutas protegidas.

## Roles y autenticación

`/api/auth/register` y `/api/auth/login` devuelven `{ token, user }`, donde `user.role` es `admin` o `user`. Envía el token en cada petición protegida:

```
Authorization: Bearer <token>
```

El JWT expira en 7 días e incluye el rol, pero las rutas `/api/admin/*` comprueban el rol actual en la base de datos. Si promueves o revocas un administrador, el cambio aplica en la siguiente petición; `/api/auth/me` también devuelve el rol vigente.

El rol nunca se acepta desde el cliente. Define `ADMIN_EMAILS` (correos separados por coma) antes de arrancar `tienda-web`; los correos de esa lista se registran como `admin`. El resto se registra como `user`.

| Rol | Catálogo | Checkout y órdenes | `/api/admin/*` |
| --- | --- | --- | --- |
| `user` | Ver | Propias | 403 |
| `admin` | Ver | Propias | CRUD completo |

## tienda-web

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Estado de la web y de la base de datos |
| GET | `/api/products` | — | Productos activos con stock |
| POST | `/api/auth/register` | — | Registro; devuelve JWT y rol |
| POST | `/api/auth/login` | — | Login; devuelve JWT y rol |
| GET | `/api/auth/me` | JWT | Usuario y rol vigentes |
| POST | `/api/checkout` | JWT | Valida stock, calcula IVA y crea la orden |
| GET | `/api/orders/{id}` | JWT | Consulta una orden propia |
| GET | `/api/orders/{id}/receipt` | JWT | Descarga el comprobante PDF |
| GET | `/api/admin/products` | Admin | Todos los productos, incluidos inactivos |
| POST | `/api/admin/products` | Admin | Crea un producto |
| PUT | `/api/admin/products/{id}` | Admin | Actualiza campos, stock o estado |
| DELETE | `/api/admin/products/{id}` | Admin | Desactiva el producto (borrado lógico) |

Un producto tiene `id`, `name`, `description`, `price` (COP entero), `color`, `stock` y, en el panel, `active` (`1`/`0`). El catálogo público solo devuelve `active=1`.

### Checkout

```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [{ "id": 1, "qty": 3 }, { "id": 4, "qty": 1 }],
    "card": { "number": "4242424242424242", "name": "Cliente", "expiry": "12/30", "cvv": "123" }
  }'
```

La respuesta incluye `order`, `items`, `customer` e `iva_fallback`. El servidor ignora los precios del cliente, valida el stock y descuenta las unidades dentro del mismo checkout. Si el stock cambió entre la validación y el descuento, responde `409` y no crea la orden. Si `ms-iva` no responde, el IVA se calcula localmente y `iva_fallback` es `true`.

### Administración

Crear un producto:

```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "name": "Bufanda de Lana", "description": "Tejido suave.", "price": 30000, "color": "#aabbcc", "stock": 10 }'
```

Cambiar solo el stock o el estado (los campos omitidos se conservan):

```bash
curl -X PUT http://localhost:3000/api/admin/products/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "stock": 4 }'

curl -X PUT http://localhost:3000/api/admin/products/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "active": 1 }'
```

Eliminar (desactivar):

```bash
curl -X DELETE http://localhost:3000/api/admin/products/7 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Validaciones: nombre obligatorio (máx. 80), descripción máx. 240, precio entero entre 0 y 100000000, stock entero entre 0 y 9999 y color `#RRGGBB`. El stock inicial del catálogo sembrado es 500 por producto.

## ms-iva

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado y tasa configurada |
| POST | `/calcular` | Recibe `{ "subtotal": 100000 }` |

```bash
curl -X POST http://localhost:4001/calcular \
  -H "Content-Type: application/json" \
  -d '{"subtotal":100000}'
```

```json
{ "subtotal": 100000, "tasa": 0.19, "iva": 19000, "total": 119000 }
```

## ms-pdf

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado y nombre de la empresa |
| POST | `/comprobante` | Recibe orden, ítems y cliente; devuelve `application/pdf` |

```bash
curl -X POST http://localhost:4002/comprobante \
  -H "Content-Type: application/json" \
  -d '{
    "order": { "id": "orden-demo", "subtotal": 100000, "iva": 19000, "total": 119000, "status": "aprobado" },
    "items": [{ "name": "Camiseta Clásica", "price": 45000, "qty": 2 }],
    "customer": { "name": "Cliente", "email": "cliente@example.com" }
  }' --output comprobante.pdf
```

## Errores

Los errores se devuelven como JSON con la forma `{ "error": "mensaje" }`.

| Código | Significado |
| --- | --- |
| 400 | Datos inválidos, carrito vacío o producto inválido |
| 401 | Token ausente, inválido o expirado |
| 403 | El usuario no tiene rol de administrador |
| 404 | Recurso no encontrado o de otro usuario |
| 409 | Correo ya registrado o stock insuficiente |
| 500 | Error interno |
| 502 | `ms-pdf` no disponible al generar el comprobante |

# Referencia de API

Cada servicio publica su contrato OpenAPI 3 y una UI interactiva:

| Servicio | Swagger UI | Contrato |
| --- | --- | --- |
| `tienda-web` | <http://localhost:3000/docs> | <http://localhost:3000/openapi.json> |
| `ms-iva` | <http://localhost:4001/docs> | <http://localhost:4001/openapi.json> |
| `ms-pdf` | <http://localhost:4002/docs> | <http://localhost:4002/openapi.json> |

En Render, reemplaza el host por el dominio de cada servicio. Usa **Authorize** en Swagger UI con el JWT para probar las rutas protegidas.

## Autenticación

`/api/auth/register` y `/api/auth/login` devuelven `{ token, user }`. Envía el token en cada petición protegida:

```
Authorization: Bearer <token>
```

El JWT expira en 7 días. El registro exige correo único y contraseña de mínimo 6 caracteres.

## tienda-web

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Estado de la web y de la base de datos |
| GET | `/api/products` | — | Catálogo de 6 productos |
| POST | `/api/auth/register` | — | Registro; devuelve JWT |
| POST | `/api/auth/login` | — | Login; devuelve JWT |
| GET | `/api/auth/me` | JWT | Usuario del token |
| POST | `/api/checkout` | JWT | Valida carrito, calcula IVA y crea la orden |
| GET | `/api/orders/{id}` | JWT | Consulta una orden propia |
| GET | `/api/orders/{id}/receipt` | JWT | Descarga el comprobante PDF |

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

La respuesta incluye `order`, `items`, `customer` e `iva_fallback`. Los precios del cliente se ignoran y el servidor recalcula todo. Si `ms-iva` no responde, el IVA se calcula localmente y `iva_fallback` es `true`.

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
| 400 | Datos inválidos o carrito vacío |
| 401 | Token ausente, inválido o expirado |
| 404 | Recurso no encontrado o de otro usuario |
| 409 | Correo ya registrado |
| 500 | Error interno |
| 502 | `ms-pdf` no disponible al generar el comprobante |

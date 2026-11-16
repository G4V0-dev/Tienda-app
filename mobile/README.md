# Tienda Básica — App Expo

App móvil en **Expo SDK 54 + Expo Router + TypeScript** que consume la API de `web/`. Incluye login, catálogo, carrito persistente con AsyncStorage, pago simulado y descarga/compartición de la factura PDF.

## Requisitos

- Node.js 20 o superior.
- Backend `web/` + `services/iva` + `services/pdf` corriendo (`npm run dev` desde la raíz).
- Expo Go para SDK 54, o un emulador Android/iOS.

> Expo Go solo soporta una versión de SDK a la vez. Si la tuya no es la 54, usa un development build (`npx expo run:android`).

## Ejecutar

```bash
cd mobile
npm install
npm start
```

Escanea el QR con Expo Go (Android) o con la cámara (iOS).

## Conexión al backend

La app resuelve la URL de la API en este orden:

1. `EXPO_PUBLIC_API_URL`.
2. La IP de Metro en el puerto `3000`.
3. `http://10.0.2.2:3000` en el emulador Android.
4. `http://localhost:3000` en iOS y web.

Si el teléfono no alcanza el backend, crea `mobile/.env` y reinicia Metro:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

En Android físico, el firewall del PC debe permitir el puerto 3000.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm start` | Metro / Expo Go |
| `npm run android` | Metro + emulador Android |
| `npm run ios` | Metro + simulador iOS (macOS) |
| `npm test` | Jest + Testing Library |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run export:web` | Export estático para validar el bundle |

## Notas

- El catálogo muestra el stock disponible y deshabilita los productos agotados; el carrito nunca supera las unidades disponibles.
- El pago es ficticio: tarjeta de prueba `4242 4242 4242 4242`, `12/30`, CVV `123`.
- El PDF es un comprobante ficticio sin validez fiscal.
- Un build de producción necesita HTTPS en el backend; Android bloquea tráfico cleartext fuera de Expo Go.

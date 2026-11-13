# Tienda Básica — App Expo

App móvil en **Expo SDK 54 + Expo Router + TypeScript** que consume la API de
`web/` (Express). Incluye autenticación, catálogo, carrito persistente, pago
simulado y descarga/compartición de la factura en PDF.

## Requisitos

- Node.js 20 o superior (el repo se probó con Node 22).
- Backend `web/` + microservicios `services/iva` y `services/pdf` corriendo.
- Expo Go en el teléfono (SDK 54) o un emulador Android/iOS.

> Expo Go solo mantiene una versión de SDK a la vez. Si tu Expo Go ya no
> soporta SDK 54, usa un development build (`npx expo run:android`) o instala
> la versión de Expo Go correspondiente a SDK 54.

## Instalación

Desde la raíz del repo:

```bash
npm run install:all
```

O solo la app móvil:

```bash
cd mobile
npm install
```

## Ejecutar

1. Arranca el backend en otra terminal:

   ```bash
   cd ..
   npm run dev
   ```

   Servicios: web `http://localhost:3000`, IVA `:4001`, PDF `:4002`.

2. Arranca Metro:

   ```bash
   npm start
   ```

3. Escanea el QR con Expo Go (Android) o con la cámara (iOS).

### Conexión al backend

La app resuelve la URL de la API así:

1. `EXPO_PUBLIC_API_URL` si está definida.
2. La IP del bundler de Metro en el puerto `3000` (funciona en Expo Go si el
   teléfono y el PC están en la misma red Wi-Fi).
3. `http://10.0.2.2:3000` en el emulador Android.
4. `http://localhost:3000` en iOS/Web.

Si el teléfono no ve el backend, crea `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

Reinicia Metro después de cambiar el archivo. En Android físico, el firewall
del PC debe permitir el puerto 3000.

## Flujo

1. Regístrate con cualquier correo y contraseña de mínimo 6 caracteres.
2. Agrega productos desde el catálogo.
3. Ajusta cantidades en **Carrito**; el carrito se guarda en AsyncStorage.
4. Paga con la tarjeta de prueba precargada:
   - `4242 4242 4242 4242`
   - `12/30`
   - CVV `123`
5. En la pantalla de éxito pulsa **Descargar factura PDF**. El archivo se guarda
   en el directorio de documentos de la app y se abre el menú nativo para
   compartirlo o guardarlo (expo-file-system + expo-sharing).

El servidor recalcula precios, valida cantidades y calcula el IVA con
`ms-iva`; la factura la genera `ms-pdf`.

## Estructura

```
mobile/
  src/app/                 Rutas de Expo Router
    (auth)/login.tsx       Inicio de sesión
    (auth)/register.tsx    Registro
    (tabs)/index.tsx       Catálogo
    (tabs)/cart.tsx        Carrito y totales
    (tabs)/account.tsx     Cuenta y conexión
    checkout.tsx           Pago simulado
    success.tsx            Resumen y factura PDF
  src/contexts/            AuthContext, CartContext
  src/lib/                 API, carrito, dinero, validación, PDF
  src/components/          UI reutilizable
  __tests__/               Jest + Testing Library
```

## Scripts

```bash
npm start          # Metro
npm run android    # Metro + emulador Android
npm run ios        # Metro + simulador iOS (macOS)
npm test           # Jest + Testing Library
npm run typecheck  # tsc --noEmit
npm run export:web # Export estático para validar el bundle
```

## Pruebas

- `__tests__/cart.test.ts`: reducer, límites 1–99, totales e IVA, saneamiento.
- `__tests__/cart-context.test.tsx`: persistencia y restauración con AsyncStorage.
- `__tests__/money-validation.test.ts`: formato COP y validación de tarjeta.
- `__tests__/api-url.test.ts`: resolución de la URL del backend.
- `__tests__/components.test.tsx`: ProductCard, CartLine y TotalsCard.
- `__tests__/receipt.test.ts`: descarga con JWT y compartición del PDF.

## Notas

- El pago es ficticio; no se cobra dinero real.
- El PDF es un **comprobante de pago** ficticio sin validez fiscal.
- Para builds de producción necesitas HTTPS en el backend (Android bloquea
  tráfico cleartext fuera de Expo Go).
- La app usa `expo-file-system` con `enableFileSharing` en iOS para que la
  factura quede visible en la app Archivos.

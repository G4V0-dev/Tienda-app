import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { API_URL } from '@/lib/api';

export function receiptFilename(orderId: string): string {
  return `comprobante-${String(orderId).slice(0, 8)}.pdf`;
}

export function receiptUrl(orderId: string): string {
  return `${API_URL}/api/orders/${orderId}/receipt`;
}

async function downloadOnWeb(orderId: string, token: string): Promise<void> {
  const response = await fetch(receiptUrl(orderId), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    let message = 'No se pudo descargar el comprobante.';
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // La respuesta no era JSON.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = receiptFilename(orderId);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadAndShareReceipt(
  orderId: string,
  token: string
): Promise<string | null> {
  if (Platform.OS === 'web') {
    await downloadOnWeb(orderId, token);
    return null;
  }

  const destination = new File(Paths.document, receiptFilename(orderId));

  const file = await File.downloadFileAsync(receiptUrl(orderId), destination, {
    headers: { Authorization: `Bearer ${token}` },
    idempotent: true
  }).catch(() => {
    throw new Error(
      'No se pudo descargar la factura. Verifica tu sesión y que el servicio PDF esté disponible.'
    );
  });

  if (!file.exists || file.size <= 0) {
    throw new Error('El comprobante llegó vacío. Inténtalo de nuevo.');
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir archivos no está disponible en este dispositivo.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir factura',
    UTI: 'com.adobe.pdf'
  });

  return file.uri;
}

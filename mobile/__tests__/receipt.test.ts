jest.mock('expo-file-system', () => {
  const downloadFileAsync = jest.fn();

  class MockFile {
    uri: string;
    exists = true;
    size = 1024;

    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}/${name}`;
    }

    static downloadFileAsync = downloadFileAsync;
  }

  return {
    Paths: {
      document: { uri: 'file:///documents' },
      cache: { uri: 'file:///cache' }
    },
    File: MockFile,
    __downloadFileAsync: downloadFileAsync
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn()
}));

jest.mock('@/lib/api', () => ({ API_URL: 'http://api.test' }));

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  downloadAndShareReceipt,
  receiptFilename,
  receiptUrl
} from '@/lib/receipt';

const mockDownloadFileAsync = (
  FileSystem as unknown as { __downloadFileAsync: jest.Mock }
).__downloadFileAsync;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;

const ORDER_ID = 'abcdef12-3456-7890-abcd-ef1234567890';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAvailableAsync.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
  mockDownloadFileAsync.mockResolvedValue({
    exists: true,
    size: 2048,
    uri: 'file:///documents/comprobante-abcdef12.pdf'
  });
});

describe('nombres del comprobante', () => {
  it('genera el nombre y la URL a partir de la orden', () => {
    expect(receiptFilename(ORDER_ID)).toBe('comprobante-abcdef12.pdf');
    expect(receiptUrl(ORDER_ID)).toBe(
      `http://api.test/api/orders/${ORDER_ID}/receipt`
    );
  });
});

describe('downloadAndShareReceipt', () => {
  it('descarga con JWT y abre el menú nativo para compartir', async () => {
    const uri = await downloadAndShareReceipt(ORDER_ID, 'jwt-token');

    expect(mockDownloadFileAsync).toHaveBeenCalledWith(
      `http://api.test/api/orders/${ORDER_ID}/receipt`,
      expect.anything(),
      {
        headers: { Authorization: 'Bearer jwt-token' },
        idempotent: true
      }
    );
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///documents/comprobante-abcdef12.pdf',
      expect.objectContaining({
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf'
      })
    );
    expect(uri).toBe('file:///documents/comprobante-abcdef12.pdf');
  });

  it('falla si el archivo descargado está vacío', async () => {
    mockDownloadFileAsync.mockResolvedValue({ exists: false, size: 0, uri: '' });

    await expect(downloadAndShareReceipt(ORDER_ID, 'jwt-token')).rejects.toThrow(
      /vacío/
    );
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('falla si compartir no está disponible', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(downloadAndShareReceipt(ORDER_ID, 'jwt-token')).rejects.toThrow(
      /no está disponible/
    );
  });

  it('traduce el error de descarga a un mensaje claro', async () => {
    mockDownloadFileAsync.mockRejectedValue(new Error('404'));

    await expect(downloadAndShareReceipt(ORDER_ID, 'jwt-token')).rejects.toThrow(
      /No se pudo descargar la factura/
    );
  });
});

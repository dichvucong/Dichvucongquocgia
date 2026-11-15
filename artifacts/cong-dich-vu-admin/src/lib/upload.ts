export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedType = (typeof ACCEPTED)[number];

export function validateFile(file: File): string | null {
  if (!(ACCEPTED as readonly string[]).includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.';
  if (file.size <= 0) return 'Tệp rỗng.';
  if (file.size > MAX_BYTES) return 'Ảnh vượt quá 10 MB.';
  return null;
}

export function putFile(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = 180_000;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Tải tệp lên kho lưu trữ thất bại (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new Error('Mất kết nối khi tải tệp lên. Vui lòng thử lại.'));
    xhr.ontimeout = () => reject(new Error('Tải ảnh quá lâu. Vui lòng kiểm tra kết nối rồi thử lại.'));
    xhr.send(file);
  });
}

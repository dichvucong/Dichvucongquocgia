export function errorStatus(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status?: unknown }).status;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

export function errorMessage(e: unknown, fallback = "Đã xảy ra lỗi không xác định."): string {
  const s = errorStatus(e);
  if (s === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (s === 403) return "Tài khoản không có quyền thực hiện thao tác này.";
  if (s === 404) return "Không tìm thấy ảnh. Có thể ảnh đã bị xoá.";
  if (s === 413) return "Tệp vượt quá dung lượng cho phép.";
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

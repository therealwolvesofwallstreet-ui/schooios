// Server-only Supabase Storage helper — gọi từ API routes, KHÔNG import ở client components.
// Dùng REST API trực tiếp (không cần @supabase/supabase-js) để tránh thêm dependency.
// BUCKET phải là PRIVATE (không có public URL). KHÔNG bao giờ trả filePath cho client.

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "case-attachments";
  const ttl = Number(process.env.SUPABASE_SIGNED_URL_TTL ?? 3600);
  const maxBytes = Number(process.env.ATTACHMENT_MAX_BYTES ?? 8_388_608);
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return { url, key, bucket, ttl, maxBytes };
}

export function getAttachmentMaxBytes(): number {
  return Number(process.env.ATTACHMENT_MAX_BYTES ?? 8_388_608);
}

function authHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Sanitize filename: strip path-traversal, giữ ký tự an toàn, cắt 100 ký tự. */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, "_")
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\./, "_")
    .slice(0, 100);
}

/** Tạo signed upload URL (TTL 10 phút). Client PUT bytes thẳng lên Supabase — KHÔNG qua Next route. */
export async function createUploadUrl(path: string): Promise<{ signedUploadUrl: string }> {
  const { url, key, bucket } = getEnv();
  const res = await fetch(
    `${url}/storage/v1/object/upload/sign/${bucket}/${encodePath(path)}?expiresIn=600`,
    {
      method: "POST",
      headers: { ...authHeaders(key), "Content-Type": "application/json" },
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new StorageError(`createUploadUrl failed ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { signedUploadUrl?: string };
  if (!data.signedUploadUrl) throw new StorageError("No signedUploadUrl in response");
  return { signedUploadUrl: data.signedUploadUrl };
}

export interface ObjectVerifyResult {
  size: number;
  detectedMime: string | null; // từ magic bytes
}

/**
 * Verify object tồn tại + lấy size THỰC + sniff magic bytes (chống .exe đổi tên .jpg).
 * Dùng Range GET (bytes 0-11) để lấy cả content-range (total size) lẫn magic bytes trong 1 request.
 * Trả null nếu object không tồn tại.
 */
export async function verifyObject(path: string): Promise<ObjectVerifyResult | null> {
  const { url, key, bucket } = getEnv();
  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${encodePath(path)}`,
    {
      method: "GET",
      headers: { ...authHeaders(key), Range: "bytes=0-11" },
    },
  );
  if (res.status === 404 || res.status === 416) return null;
  if (!res.ok && res.status !== 206) {
    throw new StorageError(`verifyObject failed ${res.status}`);
  }

  // Content-Range: bytes 0-11/TOTAL
  const contentRange = res.headers.get("Content-Range");
  const totalSize = contentRange
    ? parseInt(contentRange.split("/")[1] ?? "0", 10)
    : Number(res.headers.get("Content-Length") ?? "0");

  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const detectedMime = detectMimeFromBytes(bytes);

  return { size: totalSize, detectedMime };
}

function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

/** Tạo signed download URL (TTL từ env). KHÔNG bao giờ trả filePath. */
export async function createViewUrl(path: string): Promise<{ url: string; expiresAt: string }> {
  const { url, key, bucket, ttl } = getEnv();
  const res = await fetch(
    `${url}/storage/v1/object/sign/${bucket}/${encodePath(path)}`,
    {
      method: "POST",
      headers: { ...authHeaders(key), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: ttl }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new StorageError(`createViewUrl failed ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { signedURL?: string; error?: string };
  if (!data.signedURL) throw new StorageError(data.error ?? "No signedURL in response");
  const fullUrl = `${url}${data.signedURL}`;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  return { url: fullUrl, expiresAt };
}

/** Xóa object khỏi Storage. Dùng sau commit-verify-fail hoặc DELETE attachment. */
export async function removeObject(path: string): Promise<void> {
  const { url, key, bucket } = getEnv();
  const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: { ...authHeaders(key), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new StorageError(`removeObject failed ${res.status}: ${text}`);
  }
}

export { ALLOWED_MIME };

export class StorageError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "StorageError";
  }
}

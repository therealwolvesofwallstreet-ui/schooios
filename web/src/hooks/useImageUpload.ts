"use client";

// Pipeline upload ảnh 3 bước: sign (BE) → PUT (Supabase direct) → commit (BE).
// Client re-encode ảnh qua canvas: giảm kích thước ≤2048px + rụng EXIF (privacy).
// Partial-fail: vẫn trả về ảnh đã thành công; caller (report/new) toast lỗi riêng.
import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AttachmentDTO, AttachmentSignResponse, AttachmentCommitResponse } from "@/lib/api-types";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

const MAX_BYTES = 8_388_608; // 8 MB client-side pre-check (server enforce final)
const MAX_DIM = 2048;

export interface StagedFile {
  id: string;
  file: File;
  preview: string; // objectURL
  reencoded?: Blob;
  status: "pending" | "signing" | "uploading" | "committing" | "done" | "error";
  progress: number; // 0-100
  errorMsg?: string;
  attachment?: AttachmentDTO;
}

async function reencodeImage(file: File): Promise<Blob> {
  const img = new Image();
  const objUrl = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Không đọc được ảnh."));
    img.src = objUrl;
  });
  URL.revokeObjectURL(objUrl);

  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > MAX_DIM || h > MAX_DIM) {
    if (w >= h) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; }
    else { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; }
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  // PNG giữ PNG (lossless), còn lại encode jpeg để rụng EXIF + nén
  const mime: AllowedMime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise<Blob>((res, rej) => {
    canvas.toBlob(
      (blob) => (blob ? res(blob) : rej(new Error("Mã hóa ảnh thất bại."))),
      mime,
      mime === "image/jpeg" ? 0.85 : undefined,
    );
  });
}

export function useImageUpload() {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // Track objectURLs cần revoke khi unmount
  const previewUrls = useRef<Set<string>>(new Set());

  const updateFile = useCallback((id: string, patch: Partial<StagedFile>) => {
    setStaged((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      for (const file of files) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
          continue; // lọc im lặng — accept attr trên input đã hướng dẫn
        }
        const preview = URL.createObjectURL(file);
        previewUrls.current.add(preview);
        const staged: StagedFile = { id, file, preview, status: "pending", progress: 0 };
        setStaged((prev) => [...prev, staged]);

        // Re-encode ngay khi add (canvas là client-only — OK trong use-client hook)
        try {
          const reencoded = await reencodeImage(file);
          if (reencoded.size > MAX_BYTES) {
            setStaged((prev) =>
              prev.map((f) =>
                f.id === id
                  ? { ...f, status: "error", errorMsg: "Ảnh quá lớn (tối đa 8 MB)." }
                  : f,
              ),
            );
          } else {
            setStaged((prev) =>
              prev.map((f) => (f.id === id ? { ...f, reencoded } : f)),
            );
          }
        } catch {
          setStaged((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, status: "error", errorMsg: "Không đọc được ảnh." }
                : f,
            ),
          );
        }
      }
    },
    [],
  );

  const removeFile = useCallback((id: string) => {
    setStaged((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
        previewUrls.current.delete(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  /** Chạy pipeline sign→PUT→commit cho tất cả file pending. Trả số file thất bại. */
  const upload = useCallback(
    async (caseId: string): Promise<{ done: AttachmentDTO[]; failCount: number }> => {
      const pending = staged.filter((f) => f.status === "pending" && f.reencoded);
      if (pending.length === 0) return { done: [], failCount: 0 };
      setIsUploading(true);

      const done: AttachmentDTO[] = [];
      let failCount = 0;

      for (const sf of pending) {
        const blob = sf.reencoded!;
        try {
          // 1. Sign
          updateFile(sf.id, { status: "signing", progress: 10 });
          const signRes = await apiFetch<AttachmentSignResponse>(
            `/api/cases/${caseId}/attachments/sign`,
            {
              method: "POST",
              body: {
                fileName: sf.file.name.slice(0, 200),
                mimeType: blob.type,
                fileSize: blob.size,
              },
            },
          );

          // 2. PUT thẳng lên Supabase (bypass Next 4.5 MB limit)
          updateFile(sf.id, { status: "uploading", progress: 40 });
          const putRes = await fetch(signRes.uploadUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": blob.type },
          });
          if (!putRes.ok) throw new Error(`Upload lên storage thất bại (${putRes.status}).`);
          updateFile(sf.id, { progress: 80 });

          // 3. Commit
          updateFile(sf.id, { status: "committing", progress: 90 });
          const commitRes = await apiFetch<AttachmentCommitResponse>(
            `/api/cases/${caseId}/attachments/commit`,
            { method: "POST", body: { path: signRes.path } },
          );
          done.push(commitRes.attachment);
          updateFile(sf.id, { status: "done", progress: 100, attachment: commitRes.attachment });
        } catch (e) {
          failCount++;
          updateFile(sf.id, {
            status: "error",
            errorMsg: e instanceof Error ? e.message : "Tải ảnh thất bại.",
          });
        }
      }

      setIsUploading(false);
      return { done, failCount };
    },
    [staged, updateFile],
  );

  const clearDone = useCallback(() => {
    setStaged((prev) =>
      prev.filter((f) => {
        if (f.status === "done") {
          URL.revokeObjectURL(f.preview);
          previewUrls.current.delete(f.preview);
          return false;
        }
        return true;
      }),
    );
  }, []);

  return { staged, addFiles, removeFile, upload, isUploading, clearDone };
}

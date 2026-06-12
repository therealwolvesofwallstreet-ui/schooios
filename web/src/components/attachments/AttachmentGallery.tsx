"use client";

// Gallery ảnh đính kèm trong case-detail: thumbnail grid + lightbox (Modal).
// Nút "Thêm ảnh" chỉ hiện khi canMutate (creator|assignee|ADMIN). AUDITOR không thấy nút.
// Signed URL tải lazy khi mở lightbox (cache in-session qua useSignedView).
// Xóa: DELETE /api/cases/[caseId]/attachments/[attId] (creator|ADMIN; tùy chọn).
import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSignedView } from "@/hooks/useSignedView";
import { useImageUpload } from "@/hooks/useImageUpload";
import { AttachmentUpload } from "./AttachmentUpload";
import { useQueryClient } from "@tanstack/react-query";
import { caseDetailKey } from "@/hooks/useCaseDetail";
import { api, ApiError } from "@/lib/api";
import { useToastQueue } from "@/store/toast";
import { formatDateTime } from "@/lib/case-display";
import type { AttachmentDTO } from "@/lib/api-types";
import { cn } from "@/lib/cn";

interface Props {
  attachments: AttachmentDTO[];
  caseId: string;
  canMutate: boolean; // creator | assignee | ADMIN
  canDelete: boolean; // creator | ADMIN
  currentUserId: string;
}

export function AttachmentGallery({ attachments, caseId, canMutate, canDelete, currentUserId }: Props) {
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const push = useToastQueue((s) => s.push);
  const uploadHook = useImageUpload();

  const handleUploadDone = useCallback(async () => {
    const { done, failCount } = await uploadHook.upload(caseId);
    if (done.length > 0) {
      await queryClient.invalidateQueries({ queryKey: caseDetailKey(caseId) });
    }
    if (failCount > 0) {
      push(`${failCount} ảnh chưa tải lên — thử lại.`, "error");
    } else if (done.length > 0) {
      push(`Đã thêm ${done.length} ảnh.`, "success");
      setShowUploader(false);
      uploadHook.clearDone();
    }
  }, [uploadHook, caseId, queryClient, push]);

  async function handleDelete(attId: string) {
    setDeleting(attId);
    try {
      await api.del(`/api/cases/${caseId}/attachments/${attId}`);
      await queryClient.invalidateQueries({ queryKey: caseDetailKey(caseId) });
      push("Đã xóa ảnh.", "success");
      if (lightboxId === attId) setLightboxId(null);
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Xóa thất bại.", "error");
    } finally {
      setDeleting(null);
    }
  }

  const lightboxAtt = attachments.find((a) => a.id === lightboxId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          Ảnh đính kèm
          {attachments.length > 0 && (
            <span className="ml-1.5 font-mono text-[10px]">({attachments.length})</span>
          )}
        </h3>
        {canMutate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUploader((v) => !v)}
          >
            {showUploader ? "Đóng" : "Thêm ảnh"}
          </Button>
        )}
      </div>

      {/* Upload panel (toggle) */}
      {showUploader && canMutate && (
        <div className="border-line rounded-md border p-4">
          <AttachmentUpload caseId={caseId} hook={uploadHook} />
          {uploadHook.staged.filter((f) => f.status === "pending" && f.reencoded).length > 0 && (
            <Button
              className="mt-3"
              onClick={() => void handleUploadDone()}
              disabled={uploadHook.isUploading}
            >
              {uploadHook.isUploading ? "Đang tải…" : "Tải lên"}
            </Button>
          )}
        </div>
      )}

      {/* Thumbnail grid */}
      {attachments.length === 0 ? (
        <EmptyState message="Chưa có ảnh đính kèm." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <ThumbnailItem
              key={att.id}
              att={att}
              canDelete={canDelete && (att.uploadedBy.id === currentUserId)}
              deleting={deleting === att.id}
              onClick={() => setLightboxId(att.id)}
              onDelete={() => void handleDelete(att.id)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxAtt && (
        <LightboxModal
          att={lightboxAtt}
          onClose={() => setLightboxId(null)}
          canDelete={canDelete && lightboxAtt.uploadedBy.id === currentUserId}
          deleting={deleting === lightboxAtt.id}
          onDelete={() => void handleDelete(lightboxAtt.id)}
        />
      )}
    </div>
  );
}

function ThumbnailItem({
  att,
  canDelete,
  deleting,
  onClick,
  onDelete,
}: {
  att: AttachmentDTO;
  canDelete: boolean;
  deleting: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { url, isLoading, error } = useSignedView(att.id);

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "border-line relative h-20 w-20 overflow-hidden rounded-md border transition-opacity duration-150",
          "hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        )}
        title={att.fileName}
        aria-label={`Xem ảnh ${att.fileName}`}
      >
        {isLoading && <Skeleton className="h-full w-full" />}
        {error && (
          <div className="flex h-full w-full items-center justify-center bg-sunken">
            <span className="text-ink-3 font-mono text-[9px]">Lỗi</span>
          </div>
        )}
        {url && !isLoading && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={att.fileName} className="h-full w-full object-cover" />
        )}
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Xóa ${att.fileName}`}
          className="bg-paper-raised border-line absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border text-[10px] text-ink-3 group-hover:flex hover:text-ink disabled:opacity-50"
        >
          ×
        </button>
      )}
    </div>
  );
}

function LightboxModal({
  att,
  onClose,
  canDelete,
  deleting,
  onDelete,
}: {
  att: AttachmentDTO;
  onClose: () => void;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { url, isLoading, error, refetch } = useSignedView(att.id);

  return (
    <Modal open onClose={onClose} title={att.fileName} className="max-w-2xl">
      <div className="flex flex-col gap-4">
        {/* Image */}
        <div className="bg-sunken flex min-h-48 items-center justify-center overflow-hidden rounded-md">
          {isLoading && <Skeleton className="h-48 w-full" />}
          {error && (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-ink-3 font-mono text-xs">{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="text-ink-2 hover:text-ink text-xs underline"
              >
                Thử lại
              </button>
            </div>
          )}
          {url && !isLoading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={att.fileName}
              className="max-h-[60vh] max-w-full object-contain"
            />
          )}
        </div>
        {/* Meta */}
        <dl className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <dt className="text-ink-3 text-xs">Tên</dt>
            <dd className="text-ink-2 max-w-xs truncate text-right text-xs">{att.fileName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3 text-xs">Người tải</dt>
            <dd className="text-ink-2 text-xs">{att.uploadedBy.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3 text-xs">Thời gian</dt>
            <dd className="text-ink-2 text-xs">{formatDateTime(att.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3 text-xs">Kích thước</dt>
            <dd className="text-ink-2 font-mono text-xs">{(att.fileSize / 1024).toFixed(0)} KB</dd>
          </div>
        </dl>
        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
          {canDelete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-signal border-signal/30 hover:bg-signal/5"
            >
              {deleting ? "Đang xóa…" : "Xóa ảnh"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

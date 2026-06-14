"use client";

// Upload ảnh đính kèm — file picker + camera (capture="environment") + preview thumbnail grid.
// Warm DNA: token-only, KHÔNG đen/đỏ. Camera mobile → thẻ input accept+capture. EXIF rụng client.
// Props: caseId=null → staging mode (report/new: collect TRƯỚC khi tạo case).
//        caseId=string → upload ngay sau khi chọn (case-detail "Thêm ảnh").
import { useRef } from "react";
import { useImageUpload, type StagedFile } from "@/hooks/useImageUpload";
import { cn } from "@/lib/cn";

interface Props {
  /** null khi chưa có caseId (report/new staging). Non-null → upload ngay (case-detail add). */
  caseId: string | null;
  hook: ReturnType<typeof useImageUpload>;
  disabled?: boolean;
  className?: string;
}

const STATUS_LABEL: Record<StagedFile["status"], string> = {
  pending: "",
  converting: "Đang chuyển ảnh…",
  signing: "Đang chuẩn bị…",
  uploading: "Đang tải…",
  committing: "Đang xác nhận…",
  done: "Xong",
  error: "Lỗi",
};

export function AttachmentUpload({ hook, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { staged, addFiles, removeFile } = hook;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void addFiles(files);
    // Reset input để chọn lại cùng file nếu muốn
    e.target.value = "";
  }

  const canAdd = !disabled && !hook.isUploading;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Thumbnail grid */}
      {staged.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {staged.map((sf) => (
            <div key={sf.id} className="relative">
              <div
                className={cn(
                  "border-line relative h-20 w-20 overflow-hidden rounded-md border",
                  sf.status === "error" && "border-signal/60",
                  sf.status === "done" && "border-signal/30",
                )}
              >
                {sf.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sf.preview}
                    alt={sf.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // HEIC đang convert: chưa có preview JPEG → nền trung tính, spinner phủ lên trên.
                  <div className="bg-sunken h-full w-full" />
                )}
                {/* Progress overlay */}
                {(sf.status === "converting" ||
                  sf.status === "signing" ||
                  sf.status === "uploading" ||
                  sf.status === "committing") && (
                  <div className="bg-paper/70 absolute inset-0 flex items-center justify-center">
                    <div className="border-signal h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                  </div>
                )}
                {sf.status === "error" && (
                  <div className="bg-paper/80 absolute inset-0 flex items-center justify-center p-1">
                    <p className="text-ink-3 text-center font-mono text-[9px] leading-tight">
                      {sf.errorMsg ?? "Lỗi"}
                    </p>
                  </div>
                )}
              </div>
              {/* Progress bar (converting chưa có % thật → dùng spinner overlay, không vẽ thanh rỗng) */}
              {sf.status !== "pending" &&
                sf.status !== "converting" &&
                sf.status !== "error" &&
                sf.status !== "done" && (
                <div className="bg-line mt-0.5 h-0.5 w-20 overflow-hidden rounded-full">
                  <div
                    className="bg-signal h-full rounded-full transition-all duration-300"
                    style={{ width: `${sf.progress}%` }}
                  />
                </div>
              )}
              {/* Remove button */}
              {(sf.status === "pending" || sf.status === "error") && (
                <button
                  type="button"
                  onClick={() => removeFile(sf.id)}
                  aria-label={`Xóa ${sf.file.name}`}
                  className="bg-paper-raised border-line absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] text-ink-3 hover:text-ink"
                >
                  ×
                </button>
              )}
              {/* Status label dưới thumbnail */}
              {STATUS_LABEL[sf.status] && sf.status !== "error" && (
                <p className="text-ink-3 mt-0.5 w-20 truncate font-mono text-[9px]">
                  {STATUS_LABEL[sf.status]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button / dropzone */}
      <label
        className={cn(
          "border-line flex cursor-pointer items-center justify-between rounded-md border border-dashed px-4 py-3 transition-colors duration-150",
          canAdd ? "hover:bg-sunken" : "cursor-not-allowed opacity-50",
        )}
      >
        <span className="text-ink-3 text-sm">
          {staged.length === 0 ? "Ảnh đính kèm" : "Thêm ảnh"}
        </span>
        <span className="text-ink-3 font-mono text-[10px] tracking-wider uppercase">
          {hook.isUploading ? "Đang tải…" : staged.length === 0 ? "Chọn / Chụp" : `${staged.length} ảnh`}
        </span>
        <input
          ref={inputRef}
          type="file"
          // +HEIC/HEIF (ảnh iPhone): khai báo cả mime LẪN đuôi để iOS picker không lọc mất; convert→JPEG ở client.
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          capture="environment"
          multiple
          disabled={!canAdd}
          onChange={handleChange}
          className="sr-only"
        />
      </label>

      <p className="text-ink-3 font-mono text-[10px]">
        Tối đa 8 MB / ảnh · JPEG · PNG · WebP · HEIC
      </p>
    </div>
  );
}

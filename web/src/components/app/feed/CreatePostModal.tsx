"use client";

// Modal tạo Thông báo (CHỈ ADMIN render — server vẫn là rào chắn). Textarea body → POST /api/posts.
// Khoá double-submit (disabled khi isPending). 400 → lỗi inline (KHÔNG toast). Thành công → reset + đóng.
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/api";
import { useCreatePost } from "@/hooks/useBroadcast";

export function CreatePostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const create = useCreatePost();

  const close = () => {
    if (create.isPending) return;
    setBody("");
    setErr(undefined);
    onClose();
  };

  const submit = () => {
    setErr(undefined);
    const trimmed = body.trim();
    if (!trimmed) {
      setErr("Nội dung không được để trống.");
      return;
    }
    if (trimmed.length > 5000) {
      setErr("Tối đa 5000 ký tự.");
      return;
    }
    create.mutate(
      { body: trimmed },
      {
        onSuccess: () => {
          setBody("");
          onClose();
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 400)
            setErr("Nội dung không hợp lệ (1–5000 ký tự).");
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={close} title="Tạo thông báo">
      <div className="flex flex-col gap-4">
        <Textarea
          label="Nội dung"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={err}
          maxLength={5000}
          placeholder="Thông báo gửi tới toàn trường…"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={create.isPending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Đang đăng…" : "Đăng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

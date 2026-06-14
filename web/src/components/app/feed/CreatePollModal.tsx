"use client";

// Modal tạo Bình chọn (CHỈ ADMIN render — server vẫn là rào chắn). Câu hỏi + danh sách option động
// (thêm/xoá, min 2 max 8) + closesAt tuỳ chọn (datetime-local → ISO) → POST /api/polls. Khoá
// double-submit. 400 → lỗi inline. Stable key per option (useRef counter) tránh lệch value khi xoá.
import { useRef, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";
import { useCreatePoll } from "@/hooks/useBroadcast";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

type OptionRow = { key: number; text: string };

export function CreatePollModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const seq = useRef(2);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<OptionRow[]>([
    { key: 0, text: "" },
    { key: 1, text: "" },
  ]);
  const [closesAt, setClosesAt] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const create = useCreatePoll();

  const reset = () => {
    setQuestion("");
    setOptions([
      { key: 0, text: "" },
      { key: 1, text: "" },
    ]);
    seq.current = 2;
    setClosesAt("");
    setErr(undefined);
  };
  const close = () => {
    if (create.isPending) return;
    reset();
    onClose();
  };

  const setOpt = (key: number, text: string) =>
    setOptions((arr) => arr.map((o) => (o.key === key ? { ...o, text } : o)));
  const addOpt = () =>
    setOptions((arr) => (arr.length < MAX_OPTIONS ? [...arr, { key: seq.current++, text: "" }] : arr));
  const removeOpt = (key: number) =>
    setOptions((arr) => (arr.length > MIN_OPTIONS ? arr.filter((o) => o.key !== key) : arr));

  const submit = () => {
    setErr(undefined);
    const q = question.trim();
    const opts = options.map((o) => o.text.trim()).filter(Boolean);
    if (!q) {
      setErr("Câu hỏi không được để trống");
      return;
    }
    if (opts.length < MIN_OPTIONS) {
      setErr("Cần ít nhất 2 phương án (không trống)");
      return;
    }
    let closesIso: string | undefined;
    if (closesAt) {
      const d = new Date(closesAt);
      if (Number.isNaN(d.getTime())) {
        setErr("Thời gian đóng không hợp lệ");
        return;
      }
      closesIso = d.toISOString();
    }
    create.mutate(
      { question: q, options: opts, closesAt: closesIso },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 400)
            setErr("Dữ liệu không hợp lệ (câu hỏi 1-500, 2-8 phương án mỗi cái ≤200 ký tự)");
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={close} title="Tạo bình chọn" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Câu hỏi"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="Câu hỏi bình chọn…"
          autoFocus
        />
        <div className="flex flex-col gap-2">
          <span className="text-ink-3 text-[11px] font-medium tracking-wider uppercase">
            Phương án
          </span>
          {options.map((o, i) => (
            <div key={o.key} className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={o.text}
                  onChange={(e) => setOpt(o.key, e.target.value)}
                  maxLength={200}
                  placeholder={`Phương án ${i + 1}`}
                />
              </div>
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  onClick={() => removeOpt(o.key)}
                  aria-label="Xoá phương án"
                  className="text-ink-3 hover:text-signal shrink-0 rounded-md p-1 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <X size={16} weight="light" />
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={addOpt}
              className="text-ink-2 hover:text-ink flex w-fit items-center gap-1.5 text-xs transition-colors duration-150 ease-quiet"
            >
              <Plus size={14} weight="light" /> Thêm phương án
            </button>
          )}
        </div>
        <Input
          label="Đóng lúc (tuỳ chọn)"
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
        />
        {err && (
          <span role="alert" className="text-signal font-mono text-xs">
            {err}
          </span>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={create.isPending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Đang tạo…" : "Tạo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

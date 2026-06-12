"use client";

// CREATE REPORT ("Cất tiếng nói") — flow biên tập MỘT-CÂU-MỘT-MÀN (next/back). Khoảnh khắc cảm
// xúc nhất của HS → kết bằng RELEASE BURST (stage moment, tải dynamic ssr:false).
// HỢP ĐỒNG (docs/API.md, server là chân lý): POST /api/cases gửi `sensitive`/`emergency` (KHÔNG
// isSensitive/isEmergency), KHÔNG gửi id/caseCode/status. priority/sensitive lấy TỪ category đã chọn
// (echo dữ liệu server cấp, không tự chế luật). Client Zod chỉ là pre-check lịch sự; 400 → server
// quyết, map details về field. Quyền: AUDITOR không tạo → KHÔNG render form (không disable giả).
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useCategories } from "@/hooks/useCategories";
import { useLocations } from "@/hooks/useLocations";
import { useCreateCase, type CreateCaseInput } from "@/hooks/useCreateCase";
import { ChoiceList, type Choice } from "@/components/report/ChoiceList";
import { ErrorState, PermissionDenied } from "@/components/app/states";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api";
import { PRIORITY_LABEL } from "@/lib/case-display";
import type { CaseListItem, CasePriority } from "@/lib/api-types";

// Burst = stage moment → KHÔNG vào ops bundle (luật motion §6/§8).
const ReleaseBurst = dynamic(() => import("@/components/motion/ReleaseBurst"), { ssr: false });

const TITLE_MIN = 5;
const DESC_MIN = 10;
const STEP_PROMPTS = ["Chuyện gì đã xảy ra?", "Thuộc nhóm nào?", "Việc xảy ra ở đâu?", "Cần xử lý ngay?"] as const;

type FieldKey = "title" | "description" | "categoryId" | "locationId";
type FieldErrors = Partial<Record<FieldKey, string>>;

// Map 400 của server (Zod issues) về field. Server là chân lý — chỉ đọc, không tự suy. Phủ TRỌN payload
// có-thể-400 (docs/API.md POST /api/cases: "category·location sai" → 400). `message` = error verbatim
// cho 400 không gắn được field (KHÔNG nuốt thành câu chung mơ hồ).
function parse400(err: unknown): { fields: FieldErrors; message: string | null } | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  const body = err.body as {
    error?: string;
    details?: Array<{ path?: (string | number)[]; message?: string }>;
  } | null;
  const fields: FieldErrors = {};
  for (const issue of body?.details ?? []) {
    const key = issue.path?.[0];
    if (key === "title" || key === "description" || key === "categoryId" || key === "locationId") {
      fields[key] = issue.message ?? "Giá trị không hợp lệ.";
    }
  }
  return { fields, message: typeof body?.error === "string" ? body.error : null };
}

export default function ReportNewPage() {
  const router = useRouter();
  const {
    user,
    role,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch: sessionRefetch,
  } = useSession();
  const cats = useCategories();
  const locs = useLocations();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CaseListItem | null>(null);

  const mutation = useCreateCase({ onCreated: setCreated });

  const selectedCategory = useMemo(
    () => cats.categories.find((c) => c.id === categoryId) ?? null,
    [cats.categories, categoryId],
  );
  const derivedPriority: CasePriority = selectedCategory?.defaultPriority ?? "MEDIUM";

  // Focus + announce câu hỏi mỗi khi đổi bước (và khi form vừa hiện) — APG wizard focus-management +
  // WCAG 4.1.3: <h1> đổi tại chỗ vốn CÂM với SR/keyboard nếu không dời focus. Hook gọi vô điều kiện
  // (trước mọi early-return); khi form chưa hiện thì headingRef null → no-op.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const showForm = !created && !sessionLoading && !!user && role !== "AUDITOR";
  useEffect(() => {
    if (showForm) headingRef.current?.focus();
  }, [step, showForm]);

  // ── 201 thành công → RELEASE BURST (thay cả màn form) ──
  if (created) {
    return <ReleaseBurst caseCode={created.caseCode} onDone={() => router.push("/")} />;
  }

  // ── Quyền / loading ──
  if (sessionLoading) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 py-12">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  // /me lỗi KHÔNG-401 (503/mạng): api.ts CHỈ tự điều hướng khi 401 → ở đây phải hiện lỗi điềm tĩnh
  // + "Thử lại", KHÔNG để màn trắng câm. UX-only (không nới quyền — server vẫn là nguồn quyền).
  if (sessionError) {
    return <ErrorState onRetry={() => void sessionRefetch()} message="Không tải được phiên làm việc." />;
  }
  if (!user) return null; // api.ts đã điều hướng /login khi 401
  if (role === "AUDITOR") {
    return (
      <PermissionDenied
        message="Mục này dành cho người cất tiếng nói."
        detail="Vai trò kiểm toán chỉ lắng nghe và lưu khố — không tạo báo cáo."
      />
    );
  }

  // ── Dẫn xuất state ──
  const titleOk = title.trim().length >= TITLE_MIN;
  const descOk = description.trim().length >= DESC_MIN;
  const stepValid = step === 0 ? titleOk && descOk : step === 1 ? !!categoryId : true;
  const isLast = step === STEP_PROMPTS.length - 1;
  const submitting = mutation.isPending;

  const categoryChoices: Choice[] = cats.categories.map((c) => ({
    id: c.id,
    label: c.name,
    hint: c.description ?? undefined,
  }));
  const locationChoices: Choice[] = locs.locations.map((l) => ({
    id: l.id,
    label: l.name,
    hint: l.building ? `${l.code} · ${l.building.name}` : l.code,
  }));

  function goNext() {
    setFormError(null);
    if (stepValid && !isLast) setStep((s) => s + 1);
  }
  function goBack() {
    setFormError(null);
    if (step > 0) setStep((s) => s - 1);
  }

  async function submit() {
    if (!categoryId) {
      setStep(1);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    const payload: CreateCaseInput = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      ...(locationId ? { locationId } : {}),
      // Chỉ gửi priority KHI category cấp — KHÔNG tự chế default thay server (priority? là optional,
      // defaultPriority nullable). derivedPriority (fallback MEDIUM) chỉ để hiển thị nhãn ở bước 4.
      ...(selectedCategory?.defaultPriority ? { priority: selectedCategory.defaultPriority } : {}),
      // `sensitive` chỉ là GỢI Ý từ category đã chọn. Server là CHÂN LÝ: sensitivity escalate-only từ
      // category (CLAUDE.md/API.md) → KHÔNG thể bị hạ phân loại bởi giá trị FE (privacy-safe kể cả khi
      // category read cũ). Gửi vì là field hợp đồng hợp lệ; server vẫn tự escalate.
      sensitive: selectedCategory?.defaultSensitive ?? false,
      emergency,
    };
    try {
      await mutation.mutateAsync(payload);
      // thành công → onCreated set `created` → burst (xem nhánh trên).
    } catch (e) {
      const parsed = parse400(e);
      if (parsed) {
        const { fields, message } = parsed;
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields);
          // Nhảy về bước SAI ĐẦU TIÊN (title/desc→0, category→1, location→2).
          if (fields.title || fields.description) setStep(0);
          else if (fields.categoryId) setStep(1);
          else if (fields.locationId) setStep(2);
        } else {
          // 400 không gắn field → message server verbatim (không nuốt thành câu chung mơ hồ).
          setFormError(message ?? "Thông tin chưa hợp lệ. Kiểm tra lại giúp mình.");
        }
      }
      // lỗi khác (403/409/429/503/network): useOptimisticMutation đã toast.
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col py-12">
      <p className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">
        {String(step + 1).padStart(2, "0")} / {String(STEP_PROMPTS.length).padStart(2, "0")}
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-ink mt-3 font-serif text-3xl leading-snug outline-none md:text-4xl"
      >
        {STEP_PROMPTS[step]}
      </h1>

      <div className="mt-10 flex flex-1 flex-col gap-6">
        {step === 0 && (
          <>
            <Input
              label="Tiêu đề ngắn"
              maxLength={200}
              placeholder="Một câu tóm tắt việc đã xảy ra"
              value={title}
              error={fieldErrors.title}
              onChange={(e) => {
                if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined }));
                setTitle(e.target.value);
              }}
            />
            <Textarea
              label="Kể lại chi tiết"
              rows={5}
              maxLength={5000}
              placeholder="Chuyện diễn ra thế nào, khi nào, có ai liên quan…"
              value={description}
              error={fieldErrors.description}
              onChange={(e) => {
                if (fieldErrors.description)
                  setFieldErrors((p) => ({ ...p, description: undefined }));
                setDescription(e.target.value);
              }}
            />
          </>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-2">
            <ChoiceList
              aria-label="Nhóm sự vụ"
              items={categoryChoices}
              value={categoryId}
              onChange={(id) => {
                setFieldErrors((p) => ({ ...p, categoryId: undefined }));
                setCategoryId(id);
              }}
              isLoading={cats.isLoading}
              isError={cats.isError}
              onRetry={cats.refetch}
              emptyMessage="Chưa có nhóm sự vụ nào."
            />
            {fieldErrors.categoryId && (
              <span role="alert" className="text-signal font-mono text-xs">
                {fieldErrors.categoryId}
              </span>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-ink-3 text-xs">Không bắt buộc — chọn nơi gần nhất hoặc bỏ qua.</p>
            <ChoiceList
              aria-label="Địa điểm"
              items={locationChoices}
              value={locationId}
              onChange={(id) => {
                if (fieldErrors.locationId) setFieldErrors((p) => ({ ...p, locationId: undefined }));
                setLocationId(id);
              }}
              isLoading={locs.isLoading}
              isError={locs.isError}
              onRetry={locs.refetch}
              emptyMessage="Chưa có địa điểm nào."
            />
            {fieldErrors.locationId && (
              <span role="alert" className="text-signal font-mono text-xs">
                {fieldErrors.locationId} — chọn lại hoặc bỏ chọn để tiếp tục.
              </span>
            )}
            {locationId && (
              <button
                type="button"
                onClick={() => {
                  if (fieldErrors.locationId) setFieldErrors((p) => ({ ...p, locationId: undefined }));
                  setLocationId(null);
                }}
                className="text-ink-3 hover:text-ink self-start text-xs underline-offset-4 transition-colors duration-150 ease-quiet hover:underline"
              >
                Bỏ chọn địa điểm
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-8">
            <ChoiceList
              aria-label="Mức độ khẩn"
              items={[
                { id: "normal", label: "Bình thường", hint: "Trường sẽ tiếp nhận và sắp xếp xử lý." },
                { id: "now", label: "Cần xử lý ngay", hint: "Đánh dấu để được ưu tiên xem xét." },
              ]}
              value={emergency ? "now" : "normal"}
              onChange={(id) => setEmergency(id === "now")}
            />

            {selectedCategory && (
              <p className="text-ink-3 font-mono text-xs">
                Theo nhóm “{selectedCategory.name}” · ưu tiên {PRIORITY_LABEL[derivedPriority]}
              </p>
            )}

            {/* Đính kèm — placeholder trang trí (KHÔNG control thật → KHÔNG aria-disabled vô nghĩa
                trên div). Upload (Supabase signed-upload) hoãn sang F4+ operational. */}
            <div className="border-line flex items-center justify-between rounded-md border border-dashed px-4 py-3 opacity-60">
              <span className="text-ink-3 text-sm">Tệp đính kèm (ảnh, tài liệu)</span>
              <span className="text-ink-3 font-mono text-[10px] tracking-wider uppercase">Sắp có</span>
            </div>
          </div>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-ink-3 mt-6 font-mono text-xs">
          {formError}
        </p>
      )}

      {/* Footer điều hướng — nút primary (đỏ) là dấu signal DUY NHẤT của màn. */}
      <div className="mt-10 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={goBack} disabled={step === 0 || submitting}>
          Quay lại
        </Button>
        {isLast ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Đang gửi…" : "Cất tiếng nói"}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!stepValid}>
            Tiếp
          </Button>
        )}
      </div>
    </div>
  );
}

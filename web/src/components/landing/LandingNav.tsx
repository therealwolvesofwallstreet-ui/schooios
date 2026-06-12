// LANDING NAV — nội dung MANG NGHĨA (children z-10, Stage nổi trên lớp trang trí). Bố cục IG-tối-giản:
// logo · "Giới thiệu" / tagline Cormorant (giọng người) · "Cuộn xuống" / "Vào hệ thống →" · loader góc.
// Tagline tiếng Việt: Cormorant thiếu dấu → --font-display tự rớt sang Newsreader (xem layout.tsx). Token-
// only. Link min-h-44 (touch target). Loader CHỈ quay motion-safe (reduced-motion → tĩnh, 0 animate; cũng
// bị globals.css tắt). Link đích là placeholder fragment — scroll→login nối ở F2c. KHÔNG hook → tĩnh.
export function LandingNav() {
  return (
    <div className="text-ink grid h-dvh grid-rows-[auto_1fr_auto] px-[clamp(16px,4vw,44px)] py-[clamp(20px,4vw,34px)]">
      {/* header: logo · Giới thiệu */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="border-ink relative block h-[30px] w-[26px] rounded-[3px_3px_14px_14px] border-[1.5px]">
            <span className="bg-ink absolute top-[5px] left-1/2 h-[13px] w-[1.5px] -translate-x-1/2" />
          </span>
          <span className="font-mono text-[12px] tracking-[0.26em] uppercase">SchooIOS</span>
        </div>
        <a
          href="#gioi-thieu"
          className="hover:text-ink-2 inline-flex min-h-[44px] items-center px-2 text-sm"
        >
          Giới thiệu
        </a>
      </header>

      {/* center: tagline + scroll cue ở dải dưới (chừa khoảng trên cho wordmark nền — airy). */}
      <div className="flex flex-col items-center justify-end gap-5 pb-[clamp(24px,6vh,72px)] text-center">
        <p className="font-display text-[clamp(28px,4.4vw,56px)] leading-[1.08]">
          <span className="text-ink-2 italic">Lưu khố sống</span> của những tiếng nói
        </p>
        <a
          href="#cuon-xuong"
          className="text-ink-2 inline-flex min-h-[44px] items-center gap-2 px-2 text-sm"
        >
          Cuộn xuống <span aria-hidden="true">↓</span>
        </a>
      </div>

      {/* footer: Vào hệ thống · loader */}
      <footer className="flex items-center justify-between">
        <a
          href="#vao-he-thong"
          className="hover:text-ink-2 inline-flex min-h-[44px] items-center gap-2 px-2 text-sm"
        >
          Vào hệ thống
          <span className="text-mute" aria-hidden="true">→</span>
        </a>
        <span
          className="border-mute block h-[34px] w-[34px] rounded-full border-[1.5px] border-t-transparent motion-safe:animate-spin"
          aria-hidden="true"
        />
      </footer>
    </div>
  );
}

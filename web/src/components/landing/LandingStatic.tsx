// LANDING · REDUCED tier [LAW] — prefers-reduced-motion / SSR / không-JS. DOM/SVG THUẦN, TĨNH (0 canvas,
// 0 animation). Port relief từ design-vision/landing-warm.html: feTurbulence + feDiffuseLighting (ánh sáng
// az~228°/el~58°) thành phù điêu thạch cao + texture mịn, phủ warmth ấm + wordmark HAI GIỌNG khắc nhẹ
// (echo high tier). MÀU lấy từ tokens qua var() (HARD LAW token-only) — KHÔNG hardcode palette. Đây là
// thứ runner reduced-motion / SSR thấy: phải tĩnh, đọc được. Lớp TRANG TRÍ (Stage bọc aria-hidden).
//
// Server component được (thuần markup tĩnh) — KHÔNG "use client".
export default function LandingStatic() {
  return (
    <div className="absolute inset-0">
      {/* RELIEF — feTurbulence + diffuse lighting (tĩnh, deterministic → 2 shot 0-diff). */}
      <svg
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 820"
        aria-hidden="true"
      >
        <defs>
          {/* phù điêu khối lớn — trồi lên như Immersive Garden */}
          <filter id="landingReliefBig" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.004 0.006"
              numOctaves={3}
              seed={11}
              result="n"
            />
            <feDiffuseLighting
              in="n"
              surfaceScale={9}
              diffuseConstant={1.05}
              result="l"
              style={{ lightingColor: "var(--color-paper-raised)" }}
            >
              <feDistantLight azimuth={228} elevation={58} />
            </feDiffuseLighting>
            <feComposite in="l" in2="SourceGraphic" operator="in" />
          </filter>
          {/* texture thạch cao mịn toàn nền */}
          <filter id="landingPlasterFine" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} result="n" />
            <feDiffuseLighting
              in="n"
              surfaceScale={1.1}
              diffuseConstant={1}
              result="l"
              style={{ lightingColor: "var(--color-paper)" }}
            >
              <feDistantLight azimuth={228} elevation={60} />
            </feDiffuseLighting>
          </filter>
        </defs>

        {/* nền đất ấm */}
        <rect width="1440" height="820" style={{ fill: "var(--color-sunken)" }} />
        {/* texture mịn (rất nhẹ) */}
        <rect width="1440" height="820" filter="url(#landingPlasterFine)" opacity="0.16" />
        {/* các khối phù điêu — fill trắng = mặt nạ hình; màu đến từ lighting-color của filter */}
        <g opacity="0.9">
          <ellipse cx="640" cy="430" rx="190" ry="150" fill="#fff" filter="url(#landingReliefBig)" />
          <ellipse cx="1330" cy="120" rx="120" ry="90" fill="#fff" filter="url(#landingReliefBig)" />
          <ellipse cx="1300" cy="470" rx="150" ry="120" fill="#fff" filter="url(#landingReliefBig)" />
          <ellipse cx="120" cy="660" rx="130" ry="100" fill="#fff" filter="url(#landingReliefBig)" />
        </g>
      </svg>

      {/* warmth — tint ấm + ánh sáng định hướng + vignette (token qua color-mix). */}
      <div
        className="absolute inset-0 opacity-90 mix-blend-multiply"
        style={{
          background:
            "radial-gradient(70% 60% at 22% 18%, color-mix(in srgb, var(--color-paper-raised) 55%, transparent), transparent 60%)," +
            "radial-gradient(80% 70% at 84% 88%, color-mix(in srgb, var(--color-ink-2) 16%, transparent), transparent 62%)," +
            "radial-gradient(120% 100% at 50% 50%, transparent 55%, color-mix(in srgb, var(--color-ink) 10%, transparent) 100%)",
        }}
      />

      {/* wordmark HAI GIỌNG — khắc nhẹ (echo high). Trang trí (aria-hidden); nav children mới mang nghĩa. */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <p
          className="font-display text-mute text-[clamp(44px,13vw,150px)] leading-none"
          style={{
            textShadow:
              "-1px -1px 0 var(--color-paper-raised), 1px 1px 2px color-mix(in srgb, var(--color-ink-2) 45%, transparent)",
          }}
        >
          <span className="italic">Schoo</span>
          <span className="text-line-2">·</span>
          <span className="font-sans font-semibold">IOS</span>
        </p>
      </div>
    </div>
  );
}

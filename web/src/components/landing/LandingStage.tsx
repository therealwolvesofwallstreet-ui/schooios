"use client";
// LANDING · HIGH tier [ONE-OFF] — nền Landing bằng R3F: fullscreen quad chạy shader (landing-shaders.ts)
// = phù điêu thạch cao FBM + GỜ CHỮ "Schoo·IOS" khắc nổi + chiếu sáng Lambert trên-trái + hạt giấy.
// frameloop="always": drift RẤT KHẼ (trôi domain khối + đảo nhẹ góc sáng) cho bề mặt "sống" (chữ NEO cố
// định theo uv). Lớp TRANG TRÍ (Stage bọc aria-hidden) — KHÔNG mang nghĩa; nav/CTA là F2a-2. Màu đọc từ
// tokens (SSOT) → uniform; KHÔNG dùng signal/accent ở relief. three/R3F SỐNG DUY NHẤT trong chunk lazy
// này (nạp khi tier=high) — KHÔNG vào server bundle (motion §6/§8). dispose geometry/material/texture.
//
// eslint-disable react-hooks/immutability — CỐ Ý cho file DUY NHẤT này: R3F là tích hợp hệ-thống-ngoài
// (GPU). Mutate uniform mỗi frame (uTime) là BẢN CHẤT imperative của WebGL — đúng thứ rule react-compiler
// này KHÔNG nhắm tới. (KHÔNG cần disable purity ở đây: useMemo không gọi Math.random như ThresholdStage.)
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color, ShaderMaterial, Vector2, type Texture } from "three";
import { LANDING_FRAG, LANDING_VERT } from "./landing-shaders";
import {
  buildLandingWordTexture,
  drawLandingWord,
  ensureLandingWordFonts,
} from "./landing-word-texture";

// Đọc --color-* từ tokens (SSOT) → bytes sRGB truyền THẲNG (ShaderMaterial KHÔNG color-managed → không
// để Color convert sang linear) để khớp đúng màu CSS trên màn hình.
function tokenColor(name: string, fallback: string): Color {
  let hex = fallback;
  if (typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) hex = v;
  }
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return new Color(r, g, b);
}

function LandingField({ wordTex }: { wordTex: Texture }) {
  const { size } = useThree();

  // ShaderMaterial dựng MỘT lần (uniform mutate imperative — xem disable đầu file). Màu đọc từ tokens;
  // tham số phù điêu (biên độ/độ nổi gờ/surfaceScale) tinh chỉnh ở đây.
  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: LANDING_VERT,
      fragmentShader: LANDING_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new Vector2(size.width, size.height) },
        uWord: { value: wordTex },
        uRaised: { value: tokenColor("--color-paper-raised", "#fbf8f1") },
        uSunken: { value: tokenColor("--color-sunken", "#eae3d5") },
        uMute: { value: tokenColor("--color-mute", "#b2967d") },
        uInk2: { value: tokenColor("--color-ink-2", "#7d5a44") },
        uReliefAmp: { value: 0.26 },
        uInscribe: { value: 0.6 },
        uSurface: { value: 3.4 },
        uAmbient: { value: 0.37 },
        uGrain: { value: 0.034 },
        uHeightTint: { value: 0.34 },
      },
    });
    // wordTex ổn định (useState ở parent); uRes cập nhật ở useEffect dưới khi resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordTex]);

  // uRes theo kích thước canvas hiện tại (resize) — cập nhật uniform, không rebuild material.
  useEffect(() => {
    (material.uniforms.uRes.value as Vector2).set(size.width, size.height);
  }, [material, size.width, size.height]);

  // R3F KHÔNG auto-dispose material truyền qua biến → tự dispose khi unmount (motion §6: tránh leak).
  useEffect(() => () => material.dispose(), [material]);

  // frameloop="always" → drift sống liên tục (rất khẽ). uTime tiến theo delta thực.
  useFrame((_, delta) => {
    material.uniforms.uTime.value = (material.uniforms.uTime.value as number) + delta;
  });

  return (
    <mesh material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function LandingStage() {
  // Xây word texture MỘT lần (sau khi font về) — tránh đo sai khi font chưa nạp. useState giữ ổn định.
  const [word, setWord] = useState<{ texture: Texture; canvas: HTMLCanvasElement } | null>(null);

  useEffect(() => {
    let alive = true;
    void ensureLandingWordFonts().then(() => {
      if (!alive) return;
      setWord(buildLandingWordTexture(window.innerWidth, window.innerHeight));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Redraw wordmark khi resize (đo lại theo viewport mới).
  useEffect(() => {
    if (!word) return;
    const onResize = () => {
      drawLandingWord(word.canvas, window.innerWidth, window.innerHeight);
      word.texture.needsUpdate = true;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [word]);

  // Dispose texture khi unmount.
  useEffect(() => {
    if (!word) return;
    const tex = word.texture;
    return () => tex.dispose();
  }, [word]);

  return (
    <Canvas
      frameloop="always"
      orthographic
      camera={{ position: [0, 0, 1] }}
      dpr={[1, 1.6]}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      {word && <LandingField wordTex={word.texture} />}
    </Canvas>
  );
}

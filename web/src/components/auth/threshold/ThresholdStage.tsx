"use client";
// THRESHOLD · HIGH tier [ONE-OFF] — ngưỡng cửa /login bằng R3F: fullscreen quad chạy shader
// (threshold-shaders.ts) = ink-field FBM + mouse-ripple + Pulse đỏ + wordmark HAI GIỌNG hé dần.
// GSAP lái timeline hé lộ: uIgnite (Pulse thức) → uRevealA (serif "Schoo" nở) → uRevealB ("IOS" bật);
// uCalm lặng trường nền. CHỈ ease token (CustomEase từ lib/cubic-bezier) — KHÔNG power/spring/bounce.
// frameloop="demand": uFrame chỉ tiến uTime + lerp mouse khi có invalidate (timeline + vòng mouse rẻ);
// dispose geometry/material khi unmount. Lớp TRANG TRÍ (Stage bọc aria-hidden) — form mới mang nghĩa.
// three/R3F/GSAP SỐNG DUY NHẤT trong chunk lazy này (nạp khi tier=high) — KHÔNG vào server bundle.
//
// eslint-disable react-hooks/purity, react-hooks/immutability — CỐ Ý cho file DUY NHẤT này: R3F + GSAP
// là tích hợp hệ-thống-ngoài (GPU). Dựng ShaderMaterial/CanvasTexture + mutate uniform mỗi frame là
// BẢN CHẤT imperative của WebGL — đúng thứ 2 rule react-compiler này KHÔNG nhắm tới. Các file
// threshold khác (Canvas/Static) KHÔNG chạm three và KHÔNG tắt rule. (Chỉ purity/immutability.)
/* eslint-disable react-hooks/purity, react-hooks/immutability */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Color, ShaderMaterial, Vector2, type Texture } from "three";
import { THRESHOLD_FRAG, THRESHOLD_VERT } from "./threshold-shaders";
import { buildWordTexture, drawWord, ensureWordFonts } from "./word-texture";
import { EASE_EMERGE_BEZIER, EASE_QUIET_BEZIER, gsapEasePath } from "@/lib/cubic-bezier";

gsap.registerPlugin(useGSAP, CustomEase);
// Ease lấy TỪ nguồn duy nhất (lib/cubic-bezier) → KHÔNG hardcode lại số bezier (chống drift token §SSOT).
CustomEase.create("thresholdEmerge", gsapEasePath(EASE_EMERGE_BEZIER));
CustomEase.create("thresholdQuiet", gsapEasePath(EASE_QUIET_BEZIER));

// Đọc --color-signal từ tokens (SSOT) → bytes sRGB truyền THẲNG (ShaderMaterial KHÔNG color-managed →
// không để Color convert sang linear) để khớp đúng màu CSS trên màn hình.
function signalColor(): Color {
  let hex = "#743014"; // fallback = --color-signal
  if (typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--color-signal").trim();
    if (v) hex = v;
  }
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return new Color(r, g, b);
}

function ThresholdField({ wordTex }: { wordTex: Texture }) {
  const { size, invalidate } = useThree();

  // Vòng chuột rẻ: lưu mục tiêu + thời điểm di chuyển cuối trong ref (không setState/re-render).
  const mouseTarget = useRef(new Vector2(0.5, 0.5));
  const lastMove = useRef(-10);

  // ShaderMaterial dựng MỘT lần (uniform mutate imperative — xem disable đầu file). Math.random cho PHA
  // khởi đầu của trường mực/ember (mỗi lần vào ngưỡng cửa khẽ khác nhau — không lặp y hệt): gọi trong
  // thân useMemo (render-phase) là KHÔNG-thuần — đúng thứ rule react-hooks/purity KHÔNG nhắm tới.
  const material = useMemo(() => {
    const startPhase = Math.random() * 1000; // pha thời gian ban đầu (giây)
    return new ShaderMaterial({
      vertexShader: THRESHOLD_VERT,
      fragmentShader: THRESHOLD_FRAG,
      uniforms: {
        uTime: { value: startPhase },
        uRevealA: { value: 0 },
        uRevealB: { value: 0 },
        uCalm: { value: 0 },
        uIgnite: { value: 0 },
        uMouseStr: { value: 0 },
        uRes: { value: new Vector2(size.width, size.height) },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uWord: { value: wordTex },
        uSignal: { value: signalColor() },
      },
    });
    // wordTex ổn định (useState ở parent); size ban đầu — uRes cập nhật ở useFrame/useEffect dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordTex]);

  // uRes theo kích thước canvas hiện tại (resize) — cập nhật uniform, không rebuild material.
  useEffect(() => {
    material.uniforms.uRes.value.set(size.width, size.height);
    invalidate();
  }, [material, size.width, size.height, invalidate]);

  // Pointermove: ghi mục tiêu (đảo trục y cho uv) + mốc thời gian (dùng uTime hiện tại làm đồng hồ).
  // invalidate để vòng demand chạy tiếp.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseTarget.current.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      lastMove.current = material.uniforms.uTime.value as number;
      invalidate();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [material, invalidate]);

  // R3F KHÔNG auto-dispose material truyền qua biến → tự dispose khi unmount (motion §6: tránh leak).
  useEffect(() => () => material.dispose(), [material]);

  // Timeline hé lộ: Pulse thức → serif nở → hệ thống bật; uCalm lặng trường. onUpdate→invalidate drive
  // frame CHỈ khi timeline chạy (frameloop="demand"). Durations bám trần cinematic.
  useGSAP(
    () => {
      const u = material.uniforms;
      u.uIgnite.value = 0;
      u.uRevealA.value = 0;
      u.uRevealB.value = 0;
      u.uCalm.value = 0;
      const tl = gsap.timeline({ onUpdate: invalidate, delay: 0.25 });
      tl.to(u.uCalm, { value: 1, duration: 4.2, ease: "thresholdQuiet" }, 0);
      tl.to(u.uIgnite, { value: 1, duration: 1.0, ease: "thresholdEmerge" }, 0);
      tl.to(u.uRevealA, { value: 1, duration: 3.0, ease: "thresholdEmerge" }, 0.9);
      tl.to(u.uRevealB, { value: 1, duration: 1.4, ease: "thresholdEmerge" }, 2.1);
      return () => {
        tl.kill();
      };
    },
    { dependencies: [material] },
  );

  // uTime tiến + lerp mouse mỗi frame được invalidate. mouseStr "thở" theo lần di chuyển gần nhất; còn
  // chênh lệch → invalidate frame kế (giữ ripple/Pulse breathe sống một nhịp ngắn sau khi chuột dừng).
  useFrame((_, delta) => {
    const u = material.uniforms;
    u.uTime.value = (u.uTime.value as number) + delta; // tiến từ pha ngẫu nhiên ban đầu
    (u.uMouse.value as Vector2).lerp(mouseTarget.current, 0.045);
    const since = (u.uTime.value as number) - lastMove.current;
    const wantStr = since < 0.1 ? 1.0 : Math.max(0, 1 - since * 0.8);
    u.uMouseStr.value += (wantStr - u.uMouseStr.value) * 0.06;
    // Pulse luôn thở + ink-field luôn trôi rất khẽ → giữ vòng demand sống bằng invalidate liên tục.
    invalidate();
  });

  return (
    <mesh material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function ThresholdStage() {
  // Xây word texture MỘT lần (sau khi font về). Trước đó render quad không texture cũng được — nhưng
  // chờ font tránh wordmark đo sai → vẽ lệch. useState giữ {texture, canvas} ổn định qua re-render.
  const [word, setWord] = useState<{ texture: Texture; canvas: HTMLCanvasElement } | null>(null);

  useEffect(() => {
    let alive = true;
    void ensureWordFonts().then(() => {
      if (!alive) return;
      const built = buildWordTexture(window.innerWidth, window.innerHeight);
      setWord(built);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Redraw wordmark khi resize (đo lại theo viewport mới) — chỉ khi đã có canvas.
  useEffect(() => {
    if (!word) return;
    const onResize = () => {
      drawWord(word.canvas, window.innerWidth, window.innerHeight);
      (word.texture as Texture).needsUpdate = true;
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
      frameloop="demand"
      orthographic
      camera={{ position: [0, 0, 1] }}
      dpr={[1, 1.6]}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      {word && <ThresholdField wordTex={word.texture} />}
    </Canvas>
  );
}

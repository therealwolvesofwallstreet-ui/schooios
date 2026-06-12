"use client";
// RELEASE BURST · HIGH tier [ONE-OFF] (motion §3, §6, §9) — R3F GPU point-particles: bung từ tâm
// (curl-noise) → tụ về một impression mềm của caseCode → tan đi khi DOM caseCode hiện rõ (orchestrator).
// GSAP drive timing scatter→converge→dissolve, CHỈ ease-out token (§3 LAW). Glow bằng soft-sprite
// (NormalBlending mực đỏ trên giấy) — KHÔNG post-FX bloom (additive trên nền sáng dễ bệt/đen, khó
// kiểm thị giác headless). Lớp TRANG TRÍ (aria-hidden) — DOM confirmation mới là vật mang nghĩa (§7).
// three/R3F SỐNG DUY NHẤT trong chunk lazy này (nạp khi tier=high) — KHÔNG vào ops bundle (§6/§8).
//
// eslint-disable react-hooks/purity, react-hooks/immutability — CỐ Ý cho file DUY NHẤT này: R3F + GSAP
// là tích hợp hệ-thống-ngoài (GPU). Khởi tạo BufferGeometry/ShaderMaterial (Math.random cho hướng bung)
// và mutate uniform mỗi frame là BẢN CHẤT imperative của WebGL — đúng thứ 2 rule react-compiler này
// KHÔNG nhắm tới. Không file ops nào khác chạm three. (purity/immutability — KHÔNG tắt rule khác.)
/* eslint-disable react-hooks/purity, react-hooks/immutability */
import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { BufferGeometry, Color, Float32BufferAttribute, NormalBlending, ShaderMaterial } from "three";
import { sampleText } from "./sample-text";
import { EASE_EMERGE_BEZIER, EASE_QUIET_BEZIER, gsapEasePath } from "@/lib/cubic-bezier";

gsap.registerPlugin(useGSAP, CustomEase);
// Ease lấy TỪ nguồn duy nhất (lib/cubic-bezier) → KHÔNG hardcode lại số bezier (chống drift token §SSOT).
CustomEase.create("burstEmerge", gsapEasePath(EASE_EMERGE_BEZIER));
CustomEase.create("burstQuiet", gsapEasePath(EASE_QUIET_BEZIER));

// ShaderMaterial tự inject position/modelViewMatrix/projectionMatrix — KHÔNG khai lại.
const VERT = /* glsl */ `
  uniform float uScatter;   // 0..1 bung ra
  uniform float uConverge;  // 0..1 tụ về caseCode
  uniform float uTime;
  uniform float uSize;
  uniform float uSwirl;
  attribute vec3 aDir;      // offset bung tối đa (world units)
  attribute float aSeed;
  varying float vAlpha;

  // — Ashima simplex noise 3D —
  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  vec3 snoiseVec3(vec3 x){
    return vec3(
      snoise(x),
      snoise(x + vec3(123.4, 234.5, 345.6)),
      snoise(x + vec3(456.7, 567.8, 678.9))
    );
  }
  vec3 curlNoise(vec3 p){
    const float e = 0.1;
    vec3 dx = vec3(e,0.0,0.0), dy = vec3(0.0,e,0.0), dz = vec3(0.0,0.0,e);
    vec3 px0 = snoiseVec3(p-dx), px1 = snoiseVec3(p+dx);
    vec3 py0 = snoiseVec3(p-dy), py1 = snoiseVec3(p+dy);
    vec3 pz0 = snoiseVec3(p-dz), pz1 = snoiseVec3(p+dz);
    float cx = (py1.z - py0.z) - (pz1.y - pz0.y);
    float cy = (pz1.x - pz0.x) - (px1.z - px0.z);
    float cz = (px1.y - px0.y) - (py1.x - py0.x);
    return normalize(vec3(cx, cy, cz) / (2.0 * e) + 1e-5);
  }

  void main(){
    vec3 scattered = aDir * uScatter;
    vec3 swirl = curlNoise(position * 0.6 + uTime * 0.12) * uSwirl * uScatter * (1.0 - uConverge);
    vec3 pos = mix(scattered + swirl, position, uConverge); // position = đích (caseCode)
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.55 + aSeed * 0.7) * (6.0 / -mv.z);
    vAlpha = smoothstep(0.0, 0.22, uScatter);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uReveal; // 1 → 0 ở cuối: tan đi nhường DOM caseCode
  varying float vAlpha;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.06, d); // lõi sáng, viền tan — "glow" tiết chế
    gl_FragColor = vec4(uColor, vAlpha * soft * uReveal * 0.9);
  }
`;

// Đọc --color-signal từ tokens (SSOT) → bytes sRGB. ShaderMaterial KHÔNG color-managed nên truyền
// thẳng .r/.g/.b (KHÔNG để Color convert sang linear) để khớp đúng màu CSS trên màn hình.
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

function BurstField({ caseCode }: { caseCode: string }) {
  const { viewport, invalidate } = useThree();

  // Chốt kích thước khung MỘT lần lúc mount (useState initializer): resize giữa burst KHÔNG rebuild
  // geometry → KHÔNG restart GSAP timeline từ t=0 (burst one-shot ~1.18s, aria-hidden; lệch scale khi
  // resize là vô hại). dims ổn định → useMemo chỉ rebuild theo caseCode.
  const [dims] = useState(() => ({ w: viewport.width, h: viewport.height }));

  // GPU resource dựng theo caseCode. (Math.random cho hướng bung — xem disable đầu file.)
  const { geometry, material } = useMemo(() => {
    const sampled = sampleText(caseCode, { fontPx: 120, step: 4, maxPoints: 2600 });
    const n = Math.max(sampled.count, 1);

    const halfW = dims.w * 0.5 * 0.55; // chữ ~55% bề rộng khung
    const halfH = halfW / (sampled.aspect || 6);
    const spread = Math.max(dims.w, dims.h) * 0.62;

    const positions = new Float32Array(n * 3); // = đích (caseCode) trong world units
    const dirs = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const nx = sampled.positions[i * 2] ?? 0;
      const ny = sampled.positions[i * 2 + 1] ?? 0;
      positions[i * 3] = nx * halfW;
      positions[i * 3 + 1] = ny * halfH;
      const a = Math.random() * Math.PI * 2;
      const r = (0.35 + Math.random() * 0.65) * spread;
      dirs[i * 3] = Math.cos(a) * r;
      dirs[i * 3 + 1] = Math.sin(a) * r;
      dirs[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.25;
      seeds[i] = Math.random();
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("aDir", new Float32BufferAttribute(dirs, 3));
    geom.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));

    const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const mat = new ShaderMaterial({
      uniforms: {
        uScatter: { value: 0 },
        uConverge: { value: 0 },
        uReveal: { value: 1 },
        uTime: { value: 0 },
        uSize: { value: 2.6 * ratio },
        uSwirl: { value: Math.min(dims.w, dims.h) * 0.12 },
        uColor: { value: signalColor() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: NormalBlending,
    });
    return { geometry: geom, material: mat };
  }, [caseCode, dims]);

  // R3F KHÔNG auto-dispose object truyền qua prop → tự dispose khi unmount/đổi (§6 LAW: tránh leak).
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Choreography: scatter → converge → dissolve. Tổng 1.18s ≤ trần cinematic 1200ms (§8 duration ladder).
  // onUpdate→invalidate() drive frame CHỈ khi timeline chạy (Canvas frameloop="demand"): hết burst là
  // loop ngừng, KHÔNG đốt GPU vô ích lúc HS đọc xác nhận (đối xứng với mid tier tự ngắt rAF).
  useGSAP(
    () => {
      const u = material.uniforms;
      u.uScatter.value = 0;
      u.uConverge.value = 0;
      u.uReveal.value = 1;
      const tl = gsap.timeline({ onUpdate: invalidate });
      tl.to(u.uScatter, { value: 1, duration: 0.34, ease: "burstEmerge" }, 0);
      tl.to(u.uConverge, { value: 1, duration: 0.66, ease: "burstQuiet" }, 0.2); // kết 0.86s
      tl.to(u.uReveal, { value: 0, duration: 0.32, ease: "burstEmerge" }, 0.86); // kết 1.18s
      return () => {
        tl.kill();
      };
    },
    { dependencies: [material] },
  );

  // uTime tiến chỉ trên frame được invalidate (trong lúc timeline chạy) → curl swirl sống khi bung,
  // đứng yên sau hội tụ (swirl đã ×(1-uConverge)=0). Không loop nền.
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export default function ReleaseBurstStage({ caseCode }: { caseCode: string }) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <BurstField caseCode={caseCode} />
    </Canvas>
  );
}

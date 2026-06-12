"use client";
// PULSEFIELD · HIGH tier [ONE-OFF] (motion §3,§6,§9) — R3F GPU "mạng tiếng nói" sống trên Đài quan sát:
// điểm-hạt warm trôi theo simplex-flow + sợi nối (LineSegments cùng hàm trôi → dính node) + quét-sáng
// (light-sweep) chạy ngang + node "khẩn" sáng signal đập. First-paint ASSEMBLY (node dâng+hiện so le).
// Glow = soft-sprite NormalBlending (mực warm trên giấy Linen) — KHÔNG additive/bloom (nền sáng dễ bệt).
// three/R3F SỐNG DUY NHẤT trong chunk lazy này (nạp khi tier=high) — KHÔNG vào ops bundle (§6/§8).
//
// eslint-disable react-hooks/immutability — CỐ Ý cho file WebGL DUY NHẤT này: mutate uniform mỗi frame
// (pu.uTime.value = …) là bản chất imperative của GPU (giống ReleaseBurstStage). KHÔNG file ops nào
// khác chạm three. (Node sinh qua seeded PRNG trong useMemo ⇒ KHÔNG cần disable purity.)
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  NormalBlending,
  ShaderMaterial,
} from "three";
import { useCanvasActive } from "@/components/motion/landing/scene-phase";
import {
  DESIGN_HALF_W,
  buildLinks,
  buildNodes,
  deriveField,
  readPalette,
} from "./field-data";
import type { DashboardResponse } from "@/lib/api-types";

// — Ashima simplex noise 3D (dùng chung point/line shader để hàm trôi GIỐNG HỆT ⇒ sợi luôn dính node) —
const NOISE = /* glsl */ `
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
  vec3 drift(vec3 pos, float t, float freq, float amp){
    vec2 fl = vec2(snoise(vec3(pos.xy*freq, t)), snoise(vec3(pos.xy*freq + 19.3, t)));
    return pos + vec3(fl*amp, 0.0);
  }
`;

const POINT_VERT = /* glsl */ `
  uniform float uTime, uAssemble, uFreq, uDrift, uSize, uSweepX, uSweepW;
  uniform vec3 uColLink, uColGold, uColSignal;
  attribute float aSeed, aKind, aHot;
  varying float vAlpha, vGlow, vHot;
  varying vec3 vColor;
  ${NOISE}
  void main(){
    vec3 pos = drift(position, uTime, uFreq, uDrift);
    float a = clamp((uAssemble - aSeed*0.45)/0.55, 0.0, 1.0);
    pos.y -= (1.0 - a) * 0.20;                       // dâng lên khi assembly
    float g = exp(-pow((position.x - uSweepX)/uSweepW, 2.0));
    float pulse = aHot > 0.5 ? (0.5 + 0.5*sin(uTime*13.0 + aSeed*6.283)) : 0.0;
    vGlow = g; vHot = aHot; vAlpha = a;
    vColor = aKind < 0.5 ? uColLink : (aKind < 1.5 ? uColGold : uColSignal);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    // size: nền + quét-sáng phình + node khẩn to & đập rõ.
    float size = uSize*(0.62 + aSeed*0.85) + g*uSize*0.75 + aHot*(uSize*1.55 + pulse*uSize*1.05);
    gl_PointSize = size * (6.0 / -mv.z);
  }
`;
const POINT_FRAG = /* glsl */ `
  varying float vAlpha, vGlow, vHot;
  varying vec3 vColor;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // lõi đặc + quầng mềm → tia sáng warm (mực trên giấy, NormalBlending chồng nhau ấm dần).
    float core = smoothstep(0.30, 0.0, d);
    float halo = smoothstep(0.5, 0.12, d) * 0.5;
    float bright = 0.64 + vGlow*0.5 + vHot*0.4;
    gl_FragColor = vec4(vColor, clamp(vAlpha*(core + halo)*bright, 0.0, 1.0));
  }
`;
const LINE_VERT = /* glsl */ `
  uniform float uTime, uAssemble, uFreq, uDrift, uSweepX, uSweepW;
  attribute float aSeed;
  varying float vA;
  ${NOISE}
  void main(){
    vec3 pos = drift(position, uTime, uFreq, uDrift);
    float a = clamp((uAssemble - aSeed*0.4)/0.5, 0.0, 1.0);
    float g = exp(-pow((position.x - uSweepX)/uSweepW, 2.0));
    vA = a * (0.17 + g*0.20);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const LINE_FRAG = /* glsl */ `
  uniform vec3 uColMute;
  varying float vA;
  void main(){ gl_FragColor = vec4(uColMute, vA); }
`;

function col(rgb: [number, number, number]): Color {
  return new Color(rgb[0], rgb[1], rgb[2]); // raw sRGB (KHÔNG color-managed) — khớp CSS như ReleaseBurst
}

function PulseNetwork({ metrics }: { metrics: DashboardResponse | null }) {
  const { viewport } = useThree();
  // Chốt khung 1 lần lúc mount: resize giữa chừng KHÔNG rebuild geometry (drift/assembly liên tục, lệch
  // scale khi resize là vô hại trên lớp trang trí aria-hidden).
  const [dims] = useState(() => ({ w: viewport.width, h: viewport.height }));

  const { pointGeo, pointMat, lineGeo, lineMat, drift } = useMemo(() => {
    const palette = readPalette();
    const spec = deriveField(metrics);
    const nodes = buildNodes(spec);
    const links = buildLinks(nodes);

    const sx = (dims.w * 0.5 * 0.94) / DESIGN_HALF_W; // design x → world x
    const sy = dims.h * 0.5 * 0.84; // design y∈[-1,1] → world y
    const n = nodes.length;

    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const kind = new Float32Array(n);
    const hot = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const node = nodes[i]!;
      pos[i * 3] = node.x * sx;
      pos[i * 3 + 1] = node.y * sy;
      pos[i * 3 + 2] = 0;
      seed[i] = node.seed;
      kind[i] = node.kind === "link" ? 0 : node.kind === "gold" ? 1 : 2;
      hot[i] = node.hot ? 1 : 0;
    }
    const pGeo = new BufferGeometry();
    pGeo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    pGeo.setAttribute("aSeed", new Float32BufferAttribute(seed, 1));
    pGeo.setAttribute("aKind", new Float32BufferAttribute(kind, 1));
    pGeo.setAttribute("aHot", new Float32BufferAttribute(hot, 1));

    // Sợi: 2 đỉnh/cạnh, mỗi đỉnh = world pos của node + seed node → cùng drift() ⇒ dính node.
    const lpos = new Float32Array(links.length * 2 * 3);
    const lseed = new Float32Array(links.length * 2);
    for (let k = 0; k < links.length; k++) {
      const [i, j] = links[k]!;
      lpos[k * 6] = pos[i * 3]!;
      lpos[k * 6 + 1] = pos[i * 3 + 1]!;
      lpos[k * 6 + 2] = 0;
      lpos[k * 6 + 3] = pos[j * 3]!;
      lpos[k * 6 + 4] = pos[j * 3 + 1]!;
      lpos[k * 6 + 5] = 0;
      lseed[k * 2] = seed[i]!;
      lseed[k * 2 + 1] = seed[j]!;
    }
    const lGeo = new BufferGeometry();
    lGeo.setAttribute("position", new Float32BufferAttribute(lpos, 3));
    lGeo.setAttribute("aSeed", new Float32BufferAttribute(lseed, 1));

    const ratio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const worldW = dims.w;
    const driftAmt = Math.min(dims.w, dims.h) * 0.06;
    const sweepW = worldW * 0.13;
    const shared = { uFreq: 0.42, uDrift: driftAmt, uSweepX: 0, uSweepW: sweepW };

    const pMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAssemble: { value: 0 },
        uFreq: { value: shared.uFreq },
        uDrift: { value: shared.uDrift },
        uSize: { value: 7.0 * ratio },
        uSweepX: { value: 0 },
        uSweepW: { value: shared.uSweepW },
        uColLink: { value: col(palette.link.rgb) },
        uColGold: { value: col(palette.gold.rgb) },
        uColSignal: { value: col(palette.signal.rgb) },
      },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: NormalBlending,
    });
    const lMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAssemble: { value: 0 },
        uFreq: { value: shared.uFreq },
        uDrift: { value: shared.uDrift },
        uSweepX: { value: 0 },
        uSweepW: { value: shared.uSweepW },
        uColMute: { value: col(palette.mute.rgb) },
      },
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: NormalBlending,
    });

    const halfW = dims.w * 0.5;
    return {
      pointGeo: pGeo,
      pointMat: pMat,
      lineGeo: lGeo,
      lineMat: lMat,
      drift: { halfW },
    };
  }, [metrics, dims]);

  // dispose GPU resource khi unmount/đổi (§6 LAW — tránh leak).
  useEffect(
    () => () => {
      pointGeo.dispose();
      pointMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    },
    [pointGeo, pointMat, lineGeo, lineMat],
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const noiseT = t * 0.16; // trôi chậm
    const assemble = Math.min(t / 1.6, 1); // first-paint assembly ~1.6s
    const frac = (t * 0.085) % 1; // light-sweep ~11.7s/vòng
    const sweepX = (-1.12 + 2.24 * frac) * drift.halfW;
    const pu = pointMat.uniforms;
    const lu = lineMat.uniforms;
    pu.uTime.value = noiseT;
    pu.uAssemble.value = assemble;
    pu.uSweepX.value = sweepX;
    lu.uTime.value = noiseT;
    lu.uAssemble.value = assemble;
    lu.uSweepX.value = sweepX;
  });

  return (
    <>
      <lineSegments geometry={lineGeo} material={lineMat} frustumCulled={false} />
      <points geometry={pointGeo} material={pointMat} frustumCulled={false} />
    </>
  );
}

export default function PulseFieldStage({ metrics }: { metrics: DashboardResponse | null }) {
  // F5c idle-pause: KHÔNG crossfade (layer=null) → chỉ pause khi tab ẩn (visibility). Tab hiện lại → resume.
  const active = useCanvasActive(null);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <PulseNetwork metrics={metrics} />
    </Canvas>
  );
}

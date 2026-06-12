// LANDING RELIEF — GLSL cho nền Landing (HIGH tier). Bề mặt THẠCH CAO (plaster) đắp nổi như phù điêu:
// heightmap = FBM hữu cơ (khối lớn + chi tiết vừa) + GỜ CHỮ "Schoo·IOS" khắc nổi đọc từ texture (R=serif
// Cormorant, G=sans Plex). Pháp tuyến tính từ gradient chiều cao (finite-diff) → CHIẾU SÁNG Lambert một
// nguồn KEY từ trên-trái (azimuth ~228°, elevation ~58° — khớp design-vision/landing-warm.html), thêm
// fill mềm. Chất MATTE thuần (KHÔNG specular/glow/neon). Hạt giấy (grain) tinh + drift rất khẽ (trôi
// domain khối lớn + đảo nhẹ góc sáng theo uTime) cho bề mặt "sống" mà CHỮ vẫn neo cố định (đọc theo vUv).
//
// Màu KHÔNG hardcode: bơm qua uniform đọc --color-* từ tokens (SSOT) — KHÔNG dùng signal/accent ở đây
// (accent #743014 chỉ dành CTA, F2a-2). ShaderMaterial KHÔNG color-managed → truyền thẳng sRGB bytes.
// Fullscreen quad: position/uv là attribute three cấp mặc định; vert chỉ chiếu phẳng (bỏ qua camera).

export const LANDING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const LANDING_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform sampler2D uWord;          // R="Schoo" (serif) · G="IOS" (sans) — mặt nạ gờ chữ
  uniform vec3  uRaised, uSunken, uMute, uInk2; // tông thạch cao (từ tokens): highlight→mid→camel→cocoa
  uniform float uReliefAmp;         // biên độ khối lớn
  uniform float uInscribe;          // độ nổi của gờ chữ (HERO)
  uniform float uSurface;           // "surfaceScale" — độ dốc pháp tuyến (sắc nét gờ/khối)
  uniform float uAmbient;           // fill ambient (đáy độ sáng)
  uniform float uGrain;             // biên độ film-grain răng giấy (theo MÀU — độc lập surfaceScale)
  uniform float uHeightTint;        // nâng sáng theo CHIỀU CAO (đỉnh sáng/lõm tối) — gờ chữ nổi KHỐI

  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

  // — Ashima simplex 2D (gradient noise) — MƯỢT/hữu cơ (KHÁC value-noise → KHÔNG vảy blocky dưới sáng) —
  vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0*fract(p*C.www)-1.0;
    vec3 h = abs(x)-0.5;
    vec3 ox = floor(x+0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x*x0.x + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0 * dot(m, g);
  }
  // Chiều cao bề mặt tại 1 điểm uv (đã hiệu chỉnh aspect). drift trôi KHỐI LỚN theo thời gian; GỜ CHỮ
  // đọc theo uv (KHÔNG drift) → neo cố định, đọc rõ. CHỈ 2 octave THẤP → khối lớn MƯỢT, KHÔNG sinh worm
  // khi surfaceScale cao (octave cao bị surfaceScale phóng đại thành vảy → đã bỏ; tooth lấy từ MÀU bên
  // dưới, độc lập surfaceScale). Wordmark là phần TẦN-SỐ-CAO duy nhất → gờ chữ sắc nét HERO.
  float heightAt(vec2 uv, float asp){
    vec2 p = vec2(uv.x*asp, uv.y);
    vec2 drift = vec2(uTime*0.010, uTime*0.005);
    float smoothB = snoise(p*0.85 + drift) + 0.42*snoise(p*1.8 - drift*0.7); // khối lớn êm
    float ridge = 1.0 - abs(snoise(p*1.3 + 4.0));      // gờ "đắp bay" (creases) — bớt vẻ LỎNG, thêm chất CARVED
    float big = mix(smoothB, (ridge - 0.5) * 1.7, 0.25); // ~25% ridge: plaster troweled, vẫn airy (freq thấp)
    vec4 w = texture2D(uWord, uv);
    float wm = max(w.r, w.g);                          // gờ chữ hai giọng gộp (HERO)
    return big*uReliefAmp + wm*uInscribe;
  }

  void main(){
    float asp = uRes.x/uRes.y;
    vec2  e   = vec2(1.4/uRes.x, 1.4/uRes.y);         // finite-diff ~1.4px → gờ chữ sắc, khối mượt

    float h  = heightAt(vUv, asp);
    float hx = heightAt(vUv + vec2(e.x, 0.0), asp);
    float hy = heightAt(vUv + vec2(0.0, e.y), asp);
    vec3  n = normalize(vec3(-(hx-h)/e.x*uSurface, -(hy-h)/e.y*uSurface, 1.0));

    // KEY light: trên-trái (az~228°, el~58°), đảo nhẹ theo thời gian (sống). vUv.y hướng LÊN →
    // -sin(az) đặt nguồn phía trên. (cos228≈-0.67 → trái; -sin228≈+0.74 → trên.)
    float az = radians(228.0) + 0.05*sin(uTime*0.07);
    float el = radians(58.0);
    float ce = cos(el);
    vec3  L  = normalize(vec3(cos(az)*ce, -sin(az)*ce, sin(el)));

    // Lambert + wrap nhẹ (thạch cao tán xạ — terminator dịu) + fill ambient. KHÔNG specular/glow.
    float wrap = 0.10;
    float diff = clamp((dot(n, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
    float lit  = uAmbient + (1.0 - uAmbient) * diff;
    // Nâng sáng theo CHIỀU CAO tuyệt đối (form-light/AO ngược): đỉnh/gờ chữ NỔI bắt sáng hơn, lõm tối hơn
    // → wordmark đọc thành KHỐI đặc (không chỉ viền), khối lớn dày chiều sâu. (Lambert lo hướng; cái này lo độ cao.)
    lit += clamp(h, -0.6, 0.6) * uHeightTint;

    // MỘT chất thạch cao kem ấm: ánh sáng điều biến ĐỘ SÁNG quanh nó (KHÔNG nhảy sang chất khác → tránh
    // mảng 2-tông như da bò). Bóng = kem ngả camel ấm; chỉ KẼ NỨT sâu nhất hé cocoa (rất tiết chế).
    vec3 lo = mix(uSunken, uMute, 0.55);
    vec3 col = mix(lo, uSunken, smoothstep(0.0, 0.50, lit));
    col = mix(col, uRaised, smoothstep(0.50, 1.0, lit));
    col = mix(col, uInk2, smoothstep(0.10, 0.0, diff) * 0.22);

    // patina thạch cao: vân tông LỚN rất khẽ (theo MÀU, KHÔNG theo sáng) → chất liệu vôi vữa thật, không
    // bóng, không sinh micro-relief. ±~2% quanh tông hiện tại.
    float patina = snoise(vec2(vUv.x*asp, vUv.y)*6.5 + 17.0);
    col *= 1.0 + patina * 0.026;

    // film grain răng giấy — theo MÀU (độc lập surfaceScale → KHÔNG sinh micro-relief worm). Biên độ
    // thấp, tĩnh-từng-bước (floor) để không nhấp nháy. Đây là nguồn "tooth" plaster DUY NHẤT.
    float fg = hash(vUv*uRes + floor(uTime*6.0)) - 0.5;
    col += fg * uGrain;

    // vignette ấm, mềm — đóng khung wordmark (tâm), giữ bố cục airy (IG), không tối góc thô.
    float vig = smoothstep(1.18, 0.34, distance(vUv, vec2(0.5)));
    col *= mix(1.0, vig, 0.14);

    gl_FragColor = vec4(col, 1.0);
  }
`;

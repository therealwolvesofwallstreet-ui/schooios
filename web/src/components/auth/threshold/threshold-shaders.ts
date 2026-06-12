// THRESHOLD — GLSL cho ngưỡng cửa /login. Port từ design-vision/threshold.html (FBM 5-octave ink-field
// + mouse-ripple exp-decay + WORDMARK HAI GIỌNG đọc từ texture: R=serif "Schoo", G=sans "IOS", reveal
// bằng sweep smoothstep uRevealA/uRevealB) + grain + vignette + signal embers thở. GẤP THÊM (từ
// design-vision/gallery-gate.html) Pulse ĐỎ: lõi thở + halo + tia + vòng fract() lan ra — màu THƯƠNG HIỆU.
//
// WARM RE-SHADE (F2b): nền là DEPTH Cowhide ấm (uVoid←--color-depth, uDeep←--color-depth-sunken) thay
// near-black cũ — ngưỡng cửa = bề mặt sân khấu depth (dual-surface). Wordmark "cháy" SÁNG (uGlow←
// --color-on-depth Linen) trên nền depth. MỌI màu bơm qua uniform từ tokens (uSignal/uVoid/uDeep/uGlow),
// KHÔNG hardcode hex (token-only, SSOT) — đổi palette ở tokens.css là shader tự đổi theo.
//
// ShaderMaterial KHÔNG tự inject gì cho fullscreen quad: position/uv là attribute mặc định three cấp.

export const THRESHOLD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const THRESHOLD_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uRevealA, uRevealB, uCalm, uIgnite, uMouseStr;
  uniform vec2  uRes, uMouse;
  uniform sampler2D uWord;
  uniform vec3  uSignal;   // --color-signal (THE VOICE) — bơm từ tokens, KHÔNG hardcode
  // Nền + vân + wordmark "cháy" — TẤT CẢ bơm từ tokens (warm DEPTH/Cowhide), KHÔNG hardcode (token-only):
  uniform vec3  uVoid;     // --color-depth (Cowhide ấm — nền ngưỡng cửa, thay near-black cũ)
  uniform vec3  uDeep;     // --color-depth-sunken (vân/mực sâu hơn)
  uniform vec3  uGlow;     // --color-on-depth (Linen — wordmark cháy sáng trên depth)

  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }
  float ember(vec2 uv, vec2 c, float k){ return exp(-distance(uv,c)*k); }

  void main(){
    vec2 uv = vUv;
    float asp = uRes.x/uRes.y;
    vec2 p = vec2(uv.x*asp, uv.y);

    float t = uTime*0.035;
    float turb = mix(1.0, 0.30, uCalm); // calm → trường lặng dần

    // mouse: rẽ mực như bàn tay khua nước tĩnh — nặng, tắt dần theo khoảng cách
    vec2 m = vec2(uMouse.x*asp, uMouse.y);
    float md = distance(p, m);
    float ripple = uMouseStr * exp(-md*3.0) * 0.13;

    // ----- INK-FIELD: FBM domain-warp (5-octave) -----
    vec2 q = vec2( fbm(p*2.0 + t + ripple), fbm(p*2.0 + vec2(5.2,1.3) - t) );
    float field = fbm(p*2.4 + 2.2*q*turb + vec2(0.0, t*0.4) + ripple*2.2);

    // nền depth: vùng đậm/nhạt rất khẽ giữa uVoid↔uDeep (chiều sâu Cowhide, không bệt)
    vec3 col = mix(uVoid, uDeep, smoothstep(0.30, 0.85, field));

    // ánh sáng góc trên-trái nhẹ "thở" — gợi vault/skylight
    float light = clamp(1.0 - distance(uv, vec2(0.18,0.86))*0.62, 0.0, 1.0);
    light *= 0.85 + 0.15*sin(uTime*0.5);
    col += vec3(0.022, 0.020, 0.017) * light;

    // vân mực: gân sáng mảnh chạy theo field (nhấc nhẹ trên tối)
    float vein = smoothstep(0.46,0.50,field) - smoothstep(0.50,0.54,field);
    col += uGlow * vein * 0.035 * (1.0 - uCalm*0.45);

    // ----- THE PULSE (signal đỏ) — port từ gallery-gate, đặt phía trên wordmark -----
    vec2 oc = vec2(0.5, 0.66);          // tâm pulse (uv.y cao = phía trên màn)
    vec2 dpc = uv - oc; dpc.x *= asp;
    float r = length(dpc);
    float breathe = 0.5 + 0.5*sin(uTime*0.7);
    float ignite  = uIgnite;
    float coreR = 0.034 + breathe*0.003;
    vec2  hl = dpc - vec2(-0.010, 0.013);                 // highlight chếch trên-trái
    float shade = clamp(1.0 - length(hl)/(coreR*1.7), 0.0, 1.0);
    vec3  orbCol = mix(uSignal*0.72, uSignal*1.18, shade);
    float core = smoothstep(coreR, coreR*0.18, r);
    col = mix(col, orbCol, core*ignite);
    // halo mềm + tia dọc khẽ
    float glow = exp(-r*9.5) * (0.50 + breathe*0.30) * ignite;
    col += uSignal * glow * 0.45;
    float ray = exp(-abs(dpc.x)*44.0) * exp(-abs(dpc.y)*1.9) * 0.14 * ignite;
    col += uSignal * ray * (0.4 + breathe*0.3);
    // vòng tín hiệu lan ra — pulse phát đi (fract ring)
    float rr = fract(r*6.5 - uTime*0.30);
    float rings = smoothstep(0.0,0.06,rr) * smoothstep(0.16,0.06,rr);
    rings *= smoothstep(0.42, 0.07, r) * ignite;
    col += uSignal * rings * 0.07;

    // ----- WORDMARK: hai giọng, hai lần hé (đọc R/G từ texture) -----
    vec4 wtex = texture2D(uWord, uv);
    float maskA = wtex.r; // "Schoo" — serif / con người
    float maskB = wtex.g; // "IOS"   — sans / hệ thống
    // serif nở mềm, trái→phải
    float sweepA = smoothstep(uRevealA-0.20, uRevealA+0.05, uv.x);
    float onA = maskA * (1.0 - sweepA);
    // hệ thống bật vào sắc, gọn
    float sweepB = smoothstep(uRevealB-0.05, uRevealB+0.015, uv.x);
    float onB = maskB * (1.0 - sweepB);

    // text CHÁY SÁNG lên trên nền depth (mix về uGlow); nửa hệ thống mang chút signal
    col = mix(col, uGlow, onA);
    col = mix(col, uGlow, onB);
    col += uSignal * onB * 0.10 * (0.6 + light);

    // ----- ember signal hiếm: giọng nói bên dưới, đang thở -----
    vec2 s1 = vec2(0.50 + 0.15*sin(uTime*0.13), 0.30 + 0.04*cos(uTime*0.10));
    float flare = 0.32 + uIgnite*0.6;
    col += uSignal * ember(uv, s1, 70.0) * flare;
    col += uSignal * ember(uv, vec2(0.74 + 0.05*sin(uTime*0.09+2.0), 0.40 + 0.05*sin(uTime*0.12)), 90.0) * 0.18 * ignite;

    // ----- grain + vignette -----
    float gr = hash(uv*uRes + fract(uTime)) * 2.0 - 1.0;
    col += gr * 0.014;

    float vig = smoothstep(1.25, 0.30, distance(uv, vec2(0.5)));
    col *= mix(1.0, vig, 0.30);

    gl_FragColor = vec4(col, 1.0);
  }
`;

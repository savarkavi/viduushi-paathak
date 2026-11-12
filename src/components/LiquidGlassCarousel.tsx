"use client";

import { gsap } from "gsap";
import {
  Component,
  type ReactNode,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { PORTFOLIO_ITEMS } from "@/data/portfolio";

type WebGLErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type WebGLErrorBoundaryState = {
  hasError: boolean;
};

class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function WebGLFallback({
  className,
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      style={{ display: "grid", placeItems: "center", padding: "1.5rem" }}
    >
      <p style={{ margin: 0, textAlign: "center" }}>{message}</p>
    </div>
  );
}

export interface LiquidGlassCarouselItem {
  src: string;
  title: string;
  /** Width / height. Measured from the image when omitted. */
  aspect?: number;
}

export interface LiquidGlassCarouselProps {
  categoryTitle?: string;
  items?: LiquidGlassCarouselItem[];
  /** Maximum target panel height in CSS pixels. Scaled down to fit the carousel. */
  panelHeight?: number;
  gap?: number;
  background?: string;
  /** Play the rise-and-grow intro. Ignored when the user prefers reduced motion. */
  entry?: boolean;
  className?: string;
  style?: CSSProperties;
  onActiveChange?: (index: number) => void;
  onFocusChange?: (focused: boolean) => void;
}

const PORTRAIT_ASPECT = 3 / 4;

export const liquidGlassCarouselDefaultItems: LiquidGlassCarouselItem[] =
  PORTFOLIO_ITEMS.map(({ source, title }) => ({
    src: source,
    title,
    aspect: PORTRAIT_ASPECT,
  }));

const LENS = {
  sizeX: 0.565,
  sizeY: 1,
  posX: 0.5,
  posY: 0.5,
  rotation: 65,
  spin: 0,
  zoom: 0,
  dispersion: 11,
  blur: 0,
  glow: 4.2,
  whiteGlow: 0.24,
  novaSize: 12,
  blueRing: 6,
  ringRadius: 0.49,
  ringWidth: 0.014,
  shimmer: true,
  shimmerFreq: 12,
  shimmerSpeed: 3.5,
  shimmerDepth: 0.12,
  rimStart: 0.578,
  rimTangential: 0.6,
  rimInward: 0,
  rimFreq1: 2,
  rimFreq2: 1,
  blueColor: "#009dff",
  rimLine: 1.4,
  rimLinePos: 0.488,
  rimLineWidth: 0.003,
  vignette: 0,
  vignetteSize: 0.3,
  samples: 16,
};

const FOCUS = {
  cardDuration: 0.7,
  focusDuration: 0.9,
  cardEase: "power4.out",
  focusEase: "power3.out",
  stagger: 0.06,
  dropDist: 1.4,
  centerScale: 1.18,
  lensFade: 0.85,
};

const ENTRY = {
  delay: 0.2,
  startH: 80,
  riseDuration: 1.0,
  stagger: 0.07,
  riseEase: "power3.out",
  fromBelow: 0.9,
  growDelay: 0.25,
  growDuration: 2.15,
  growEase: "expo.inOut",
  growStagger: 0.085,
  lensBloom: 1.4,
  lensBloomEase: "power2.inOut",
};

const LENS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const LENS_FRAGMENT = /* glsl */ `
#define PI 3.14159265
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uSizeX;
uniform float uSizeY;
uniform float uAspect;
uniform float uZoom;
uniform float uDispersion;
uniform float uBlur;
uniform float uGlow;
uniform float uWhiteGlow;
uniform float uNovaSize;
uniform float uBlueRing;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uShimmer;
uniform float uShimmerFreq;
uniform float uShimmerSpeed;
uniform float uShimmerDepth;
uniform float uTime;
uniform float uRimStart;
uniform float uRimTangential;
uniform float uRimInward;
uniform float uRimFreq1;
uniform float uRimFreq2;
uniform vec3 uBlueColor;
uniform float uRimLine;
uniform float uRimLinePos;
uniform float uRimLineWidth;
uniform float uVignette;
uniform float uVignetteSize;
uniform float uShape;
uniform float uSquareRound;
uniform float uRotation;
uniform int uSamples;

const int MAX_SAMPLES = 16;

float sdRoundBox(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

vec3 discLens(vec2 center, float aspectCorrect, out float outA) {
  vec2 p = (vUv - center);
  p.x *= aspectCorrect;
  float ca = cos(uRotation), sa = sin(uRotation);
  p = mat2(ca, -sa, sa, ca) * p;
  vec2 halfSize = vec2(uSizeX, uSizeY);
  float dist = length(p / halfSize);
  outA = 0.0;

  float maskND;
  if (uShape > 0.5) {
    float corner = min(uSizeX, uSizeY) * clamp(uSquareRound, 0.0, 1.0);
    float sd = sdRoundBox(p, halfSize, corner);
    maskND = 1.0 + sd / min(uSizeX, uSizeY);
  } else {
    maskND = dist;
  }
  if (maskND > 1.0) return vec3(0.0);

  float shapeND = clamp(maskND, 0.0, 1.0);
  float nd = clamp(dist, 0.0, 1.0);
  vec2 offset = vUv - center;
  vec2 radialDir = normalize(offset + 1e-6);
  vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
  float angle = atan(p.y, p.x);

  float pull = uZoom * 0.30 * (nd * nd);
  float rimStrength = smoothstep(uRimStart, 1.0, nd);
  float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;
  float rScreen = (uSizeX + uSizeY) * 0.5;
  vec2 rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;
  vec2 rimPull = -radialDir * rimStrength * rScreen * uRimInward;

  vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;

  float rimMask = smoothstep(0.55, 1.0, nd);
  vec2 dispDir = offset * uDispersion * 0.004 * rimMask;
  vec3 col = vec3(0.0);

  if (uDispersion < 0.01 || rimMask < 0.001) {
    col = texture2D(uTex, baseUV).rgb;
  } else {
    int N = clamp(uSamples, 2, MAX_SAMPLES);
    vec3 caW = vec3(0.0);
    for (int i = 0; i < MAX_SAMPLES; i++) {
      if (i >= N) break;
      float t = float(i) / float(N - 1);
      vec2 sUV = baseUV + dispDir * (t - 0.5);
      vec3 s = texture2D(uTex, sUV).rgb;
      vec3 d = (vec3(t) - vec3(0.0, 0.5, 1.0)) / 0.38;
      vec3 w = exp(-(d * d));
      col += s * w;
      caW += w;
    }
    col /= max(caW, vec3(0.001));
  }

  float blurFade = 1.0 - smoothstep(0.72, 0.98, nd);
  if (uBlur > 0.01 && blurFade > 0.01) {
    vec2 blurRad = vec2(uBlur) / uRes * blurFade;
    vec3 bcol = vec3(0.0);
    float btw = 0.0;
    for (float a = 0.0; a < PI * 2.0; a += PI * 2.0 / 6.0) {
      for (float rr = 0.4; rr <= 1.001; rr += 0.3) {
        vec2 o = vec2(cos(a), sin(a)) * blurRad * rr;
        float w = 1.0 - rr * 0.38;
        bcol += texture2D(uTex, baseUV + o).rgb * w;
        btw += w;
      }
    }
    col = mix(bcol / btw, col, rimMask);
  }

  col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));

  float r2 = shapeND * shapeND * 0.25;
  float gs = max(uNovaSize * uGlow * 0.003, 0.004);
  float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;
  nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
  col += vec3(nova);

  float dC = shapeND * 0.5;
  float tR = clamp(uRingRadius, 0.1, 0.49);
  float rW = max(uRingWidth, 0.003);
  float dRing = (dC - tR) / rW;
  float ring = exp(-(dRing * dRing));
  ring *= uBlueRing * (uGlow / 17.0) * 1.8;
  if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);
  float dAura = (dC - tR) / (rW * 6.0);
  float ringAura = exp(-(dAura * dAura)) * 0.28 * uBlueRing * (uGlow / 17.0);
  col += uBlueColor * (ring + ringAura);
  float dRimLine = (dC - uRimLinePos) / max(uRimLineWidth, 0.0001);
  col += vec3(exp(-(dRimLine * dRimLine)) * uRimLine);

  outA = smoothstep(1.0, 0.93, maskND);
  return col;
}

void main(){
  vec3 base = texture2D(uTex, vUv).rgb;
  vec3 outc = base;
  float a = 0.0;
  vec3 c = discLens(uCenter, uAspect, a);
  outc = mix(outc, c, a);
  if (uVignette > 0.001) {
    vec2 vc = vUv - 0.5;
    vc.x *= uAspect;
    float d = length(vc) / max(uVignetteSize, 0.0001);
    float vig = 1.0 - uVignette * smoothstep(0.5, 1.0, d);
    outc *= clamp(vig, 0.0, 1.0);
  }
  gl_FragColor = vec4(outc, 1.0);
}
`;

const LENS_FX_KEYS = [
  "uDispersion",
  "uBlueRing",
  "uRimLine",
  "uVignette",
  "uZoom",
  "uRimTangential",
  "uRimInward",
] as const;

const REPEATS = 4;
const CLICK_SLOP = 6;
const TOUCH_CLICK_SLOP = 12;
const FLICK_IDLE_MS = 90;
const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;
const MOBILE_LENS_ZOOM = 0.1;
const TABLET_LENS_ZOOM = 0.08;

function at<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) {
    throw new Error("Index out of range.");
  }
  return item;
}

type PanelRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  poolIdx: number;
  srcIndex: number;
  centerX: number;
};

type PoolItem = {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  srcIndex: number;
  bound: boolean;
};

type Source = {
  tex: THREE.Texture | null;
  aspect: number;
  locked: boolean;
};

export type LiquidGlassCarouselHandle = {
  closeFocus: () => void;
  next: () => void;
  previous: () => void;
  destroy: () => void;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function hexToNumber(background: string) {
  const value = background.trim();
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
    const hex =
      value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    const parsed = Number.parseInt(hex.slice(1), 16);
    return Number.isFinite(parsed) ? parsed : 0xffffff;
  }
  return 0xffffff;
}

function createCarousel(
  mount: HTMLElement,
  cursorElement: HTMLElement | null,
  options: {
    items: LiquidGlassCarouselItem[];
    panelHeight: number;
    gap: number;
    background: string;
    entry: boolean;
    onActiveChange: (index: number) => void;
    onFocusChange: (open: boolean) => void;
    onEntryDone: (done: boolean) => void;
  },
): LiquidGlassCarouselHandle | null {
  const reduced = prefersReducedMotion();
  const entryOn = options.entry && !reduced;
  const items = options.items;
  if (items.length === 0) return null;

  let W = Math.max(1, mount.clientWidth);
  let H = Math.max(1, mount.clientHeight);
  const GAP = options.gap;
  const itemAspects = items.map((item) => item.aspect || PORTRAIT_ASPECT);
  const averageAspect = () =>
    itemAspects.reduce((sum, aspect) => sum + aspect, 0) / itemAspects.length;
  const visiblePanelTarget = () =>
    W < MOBILE_BREAKPOINT ? 2.2 : W <= TABLET_BREAKPOINT ? 3.5 : 5.5;
  const panelHFor = () =>
    Math.max(
      120,
      Math.min(
        options.panelHeight,
        Math.round(H * 0.52),
        Math.floor((W / visiblePanelTarget() - GAP) / averageAspect()),
      ),
    );
  let PANEL_H = panelHFor();
  const EASE = reduced ? 0.28 : 0.09;
  const SNAP_EASE = reduced ? 0.22 : 0.05;
  const WHEEL = 1.4;
  const DRAG = 1.6;
  const TOUCH_DRAG = 1;
  const TOUCH_EASE = 0.22;
  const FRICTION = 0.865;
  const SNAP_IDLE_MS = 120;
  const SHRINK_MAX = 60;
  const SHRINK_ATTACK = 0.25;
  const SHRINK_DECAY = 0.06;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }

  let currentDpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(currentDpr);
  renderer.setSize(W, H);
  renderer.setClearColor(hexToNumber(options.background), 1);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.userSelect = "none";
  renderer.domElement.setAttribute("aria-hidden", "true");
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -W / 2,
    W / 2,
    H / 2,
    -H / 2,
    -100,
    100,
  );
  camera.position.z = 10;

  // 1x1 placeholder texture keeps USE_MAP enabled from frame 0 so shaders never recompile
  const placeholderData = new Uint8Array([221, 221, 221, 255]);
  const placeholderTex = new THREE.DataTexture(placeholderData, 1, 1);
  placeholderTex.colorSpace = THREE.SRGBColorSpace;
  placeholderTex.needsUpdate = true;
  renderer.initTexture(placeholderTex);

  const sources: Source[] = items.map((img) => ({
    tex: null,
    aspect: img.aspect || PORTRAIT_ASPECT,
    locked: img.aspect != null,
  }));

  function slotWidth(srcIndex: number) {
    return at(sources, srcIndex).aspect * PANEL_H + GAP;
  }

  let offsets: number[] = [];
  let totalWidth = 0;
  function recomputeTotal() {
    offsets = [];
    let acc = 0;
    for (let i = 0; i < sources.length; i++) {
      offsets.push(acc);
      acc += slotWidth(i);
    }
    totalWidth = acc;
  }
  recomputeTotal();

  function centerForIndex(idx: number) {
    const N = sources.length;
    const loop = Math.floor(idx / N);
    const s = ((idx % N) + N) % N;
    return at(offsets, s) + slotWidth(s) / 2 - GAP / 2 + loop * totalWidth;
  }

  function nearestIndex(value: number) {
    if (!totalWidth) return 0;
    const N = sources.length;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < N; i++) {
      const center = at(offsets, i) + slotWidth(i) / 2 - GAP / 2;
      const k = Math.round((value - center) / totalWidth);
      const dist = Math.abs(center + k * totalWidth - value);
      if (dist < bestDist) {
        bestDist = dist;
        best = i + k * N;
      }
    }
    return best;
  }

  function centerIndex(value: number) {
    if (!totalWidth) return 0;
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < sources.length; i++) {
      const center = at(offsets, i) + slotWidth(i) / 2 - GAP / 2;
      const k = Math.round((value - center) / totalWidth);
      const dist = Math.abs(center + k * totalWidth - value);
      if (dist < bestDist) {
        bestDist = dist;
        bestI = i;
      }
    }
    return bestI;
  }

  let lastCenter = -1;
  const sharedPlaneGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  const pool: PoolItem[] = [];
  for (let r = 0; r < REPEATS; r++) {
    for (let i = 0; i < sources.length; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: placeholderTex,
        transparent: true,
      });
      const mesh = new THREE.Mesh(sharedPlaneGeo, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
      pool.push({ mesh, mat, srcIndex: i, bound: false });
    }
  }

  let scroll = centerForIndex(0);
  let target = scroll;
  let userInteracted = false;
  let velocity = 0;
  let prevScroll = 0;
  let scrollEnergy = 0;
  let pendingFocus: { srcIndex: number } | null = null;
  let lastInput = performance.now();
  let snapped = false;

  const rt = new THREE.WebGLRenderTarget(W * currentDpr, H * currentDpr);
  const lensScene = new THREE.Scene();
  const lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const lensUniforms = {
    uTex: { value: rt.texture },
    uRes: { value: new THREE.Vector2(W * currentDpr, H * currentDpr) },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uSizeX: { value: LENS.sizeX },
    uSizeY: { value: LENS.sizeY },
    uShape: { value: 0 },
    uSquareRound: { value: 0 },
    uRotation: { value: 0 },
    uAspect: { value: W / H },
    uZoom: { value: LENS.zoom },
    uDispersion: { value: LENS.dispersion },
    uBlur: { value: LENS.blur },
    uGlow: { value: LENS.glow },
    uWhiteGlow: { value: LENS.whiteGlow },
    uNovaSize: { value: LENS.novaSize },
    uBlueRing: { value: LENS.blueRing },
    uRingRadius: { value: LENS.ringRadius },
    uRingWidth: { value: LENS.ringWidth },
    uShimmer: { value: reduced || !LENS.shimmer ? 0 : 1 },
    uShimmerFreq: { value: LENS.shimmerFreq },
    uShimmerSpeed: { value: LENS.shimmerSpeed },
    uShimmerDepth: { value: LENS.shimmerDepth },
    uTime: { value: 0 },
    uRimStart: { value: LENS.rimStart },
    uRimTangential: { value: LENS.rimTangential },
    uRimInward: { value: LENS.rimInward },
    uRimFreq1: { value: LENS.rimFreq1 },
    uRimFreq2: { value: LENS.rimFreq2 },
    uBlueColor: { value: new THREE.Color(LENS.blueColor) },
    uRimLine: { value: LENS.rimLine },
    uRimLinePos: { value: LENS.rimLinePos },
    uRimLineWidth: { value: LENS.rimLineWidth },
    uVignette: { value: LENS.vignette },
    uVignetteSize: { value: LENS.vignetteSize },
    uSamples: { value: LENS.samples },
  };
  const lensMat = new THREE.ShaderMaterial({
    uniforms: lensUniforms as unknown as THREE.ShaderMaterial["uniforms"],
    vertexShader: LENS_VERTEX,
    fragmentShader: LENS_FRAGMENT,
  });
  const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat);
  lensScene.add(lensQuad);

  // Pre-compile both scenes so shader compilation never stalls the first animation frame
  renderer.compile(scene, camera);
  renderer.compile(lensScene, lensCam);

  const focusState = {
    active: false,
    srcIndex: -1,
    poolIdx: -1,
    lensFx: entryOn ? 0 : 1,
    anim: null as gsap.core.Timeline | null,
  };
  const drop = new Array(REPEATS * sources.length).fill(0);
  let focusScale = 1;
  const lastCenterX: Array<number | undefined> = new Array(
    REPEATS * sources.length,
  );
  const pEntry = new Array(REPEATS * sources.length).fill(entryOn ? 0 : 1);
  let entryActive = entryOn;
  let entrySettled = false;
  const growArr = new Array(REPEATS * sources.length).fill(entryOn ? 0 : 1);
  let entryAnim: gsap.core.Timeline | null = null;

  const lensFxFull: Record<(typeof LENS_FX_KEYS)[number], number> = {
    uDispersion: lensUniforms.uDispersion.value,
    uBlueRing: lensUniforms.uBlueRing.value,
    uRimLine: lensUniforms.uRimLine.value,
    uVignette: lensUniforms.uVignette.value,
    uZoom: lensUniforms.uZoom.value,
    uRimTangential: lensUniforms.uRimTangential.value,
    uRimInward: lensUniforms.uRimInward.value,
  };

  let panelRects: PanelRect[] = [];
  let centeredPanel: {
    srcIndex: number;
    centerX: number;
    wPx: number;
    h: number;
    poolIdx: number;
  } | null = null;

  function layout() {
    panelRects = [];
    centeredPanel = null;
    let centeredDist = Infinity;
    const half = W / 2;
    const buffer = PANEL_H;
    pool.forEach((p, poolIdx) => {
      const rep = Math.floor(poolIdx / sources.length);
      const i = p.srcIndex;
      const src = at(sources, i);
      const slotCenterInLoop = at(offsets, i) + slotWidth(i) / 2 - GAP / 2;
      let x = slotCenterInLoop - scroll;
      x = ((x % totalWidth) + totalWidth) % totalWidth;
      x += (rep - Math.floor(REPEATS / 2)) * totalWidth;
      if (x > half + totalWidth) x -= totalWidth * REPEATS;

      const centerX = x;
      const inEntry = entryActive || entrySettled;
      if (!inEntry && (centerX < -half - buffer || centerX > half + buffer)) {
        p.mesh.visible = false;
        lastCenterX[poolIdx] = undefined;
        return;
      }
      lastCenterX[poolIdx] = centerX;

      const shrink = 1 - 0.25 * scrollEnergy;
      const h = PANEL_H * shrink;
      const wPx = src.aspect * PANEL_H * shrink;

      if (src.tex && !p.bound) {
        p.mat.map = src.tex;
        p.bound = true;
      }

      let y = 0;
      const isFocused = focusState.active && focusState.poolIdx === poolIdx;
      const d = drop[poolIdx] || 0;
      let drawW = wPx;
      let drawH = h;
      if (isFocused) {
        drawW = wPx * focusScale;
        drawH = h * focusScale;
      } else if (d > 0) {
        y = -d * H * FOCUS.dropDist;
      }

      p.mesh.visible = true;
      let finalX = centerX;
      let finalY = y;
      let finalW = drawW;
      let finalH = drawH;
      if (entryActive || entrySettled) {
        const pe = pEntry[poolIdx] || 0;
        const g = growArr[poolIdx] || 0;
        const curH = ENTRY.startH + (drawH - ENTRY.startH) * g;
        finalH = curH;
        finalW = curH * src.aspect;

        const cSrc = centerIndex(scroll);
        let di = i - cSrc;
        if (di > sources.length / 2) di -= sources.length;
        if (di < -sources.length / 2) di += sources.length;
        const N = sources.length;
        const midRep = Math.floor(REPEATS / 2);
        if (rep !== midRep) {
          p.mesh.visible = false;
          lastCenterX[poolIdx] = undefined;
          return;
        }
        const slotH = (s: number) => {
          const gg = growArr[midRep * N + s] || 0;
          return ENTRY.startH + (PANEL_H - ENTRY.startH) * gg;
        };
        let off = 0;
        if (di > 0) {
          for (let k = 0; k < di; k++) {
            const sa = (((cSrc + k) % N) + N) % N;
            const sb = (((cSrc + k + 1) % N) + N) % N;
            off +=
              (at(sources, sa).aspect * slotH(sa) +
                at(sources, sb).aspect * slotH(sb)) /
                2 +
              GAP;
          }
        } else if (di < 0) {
          for (let k = 0; k < -di; k++) {
            const sa = (((cSrc - k) % N) + N) % N;
            const sb = (((cSrc - k - 1) % N) + N) % N;
            off -=
              (at(sources, sa).aspect * slotH(sa) +
                at(sources, sb).aspect * slotH(sb)) /
                2 +
              GAP;
          }
        }
        finalX = off;
        if (finalX < -half - buffer || finalX > half + buffer) {
          p.mesh.visible = false;
          lastCenterX[poolIdx] = undefined;
          return;
        }
        const below = -H * ENTRY.fromBelow;
        finalY = below + (y - below) * pe;
      }

      p.mesh.position.set(finalX, finalY, 0);
      p.mesh.scale.set(finalW, finalH, 1);

      const sx = centerX + W / 2;
      const sy = H / 2 - y;
      panelRects.push({
        left: sx - drawW / 2,
        right: sx + drawW / 2,
        top: sy - drawH / 2,
        bottom: sy + drawH / 2,
        poolIdx,
        srcIndex: i,
        centerX,
      });

      if (Math.abs(centerX) < centeredDist) {
        centeredDist = Math.abs(centerX);
        centeredPanel = { srcIndex: i, centerX, wPx, h, poolIdx };
      }
    });
  }

  function panelAtPointer(px: number, py: number) {
    for (const r of panelRects) {
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
        return r;
      }
    }
    return null;
  }

  const el = renderer.domElement;
  let cachedRect = el.getBoundingClientRect();

  function localPoint(e: { clientX: number; clientY: number }) {
    return { x: e.clientX - cachedRect.left, y: e.clientY - cachedRect.top };
  }

  let dragging = false;
  let dragPointerId: number | null = null;
  let dragLastX = 0;
  let dragDist = 0;
  let dragVel = 0;
  let dragMoveT = 0;
  let suppressClick = false;
  let dragPointerType = "mouse";
  let lastPointerX = Number.NaN;
  let lastPointerY = Number.NaN;
  let pointerInside = false;
  let lastPointerType = "mouse";

  if (cursorElement) {
    gsap.set(cursorElement, {
      xPercent: 20,
      yPercent: 30,
      scale: 0,
      autoAlpha: 0,
    });
  }
  const moveX = cursorElement
    ? gsap.quickTo(cursorElement, "x", { duration: 0.5, ease: "power3.out" })
    : null;
  const moveY = cursorElement
    ? gsap.quickTo(cursorElement, "y", { duration: 0.5, ease: "power3.out" })
    : null;

  let overPanel = false;
  let hoverPanel = false;
  let cursorNow = "";
  function setCursor(v: string) {
    if (v === cursorNow) return;
    cursorNow = v;
    el.style.cursor = v;
  }

  function updateCursor() {
    if (focusState.active || entryActive || entrySettled) return setCursor("");
    if (dragging) return setCursor("grabbing");
    if (!hoverPanel) return setCursor("");
    return setCursor("grab");
  }

  function setHover(on: boolean) {
    hoverPanel = on;
    setView(on);
  }

  function refreshHover() {
    if (!pointerInside || lastPointerType !== "mouse") return;
    if (!Number.isFinite(lastPointerX)) return;
    if (focusState.active) {
      setHover(false);
      return;
    }
    setHover(panelAtPointer(lastPointerX, lastPointerY) !== null);
  }

  function setView(on: boolean) {
    if (entryActive || entrySettled) on = false;
    if (dragging) on = false;
    if (on === overPanel) {
      updateCursor();
      return;
    }
    overPanel = on;
    updateCursor();
    if (!cursorElement) return;
    gsap.killTweensOf(cursorElement, "scale,autoAlpha,opacity,visibility");
    gsap.to(cursorElement, {
      scale: on ? 1 : 0,
      autoAlpha: on ? 1 : 0,
      duration: on ? 0.35 : 0.25,
      ease: on ? "power3.out" : "power3.in",
    });
  }

  function inputLocked() {
    return focusState.active || entryActive || entrySettled;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (inputLocked()) return;
    userInteracted = true;
    pendingFocus = null;
    target += (e.deltaY || e.deltaX) * WHEEL;
    lastInput = performance.now();
    snapped = false;
  }

  function onPointerDown(e: PointerEvent) {
    cachedRect = el.getBoundingClientRect();
    suppressClick = false;
    if (inputLocked()) return;
    if (dragging) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragging = true;
    dragPointerId = e.pointerId;
    dragPointerType = e.pointerType || "mouse";
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    const p = localPoint(e);
    dragLastX = p.x;
    lastPointerX = p.x;
    lastPointerY = p.y;
    dragDist = 0;
    dragVel = 0;
    dragMoveT = performance.now();
    setView(false);
    velocity = 0;
    pendingFocus = null;
    userInteracted = true;
    snapped = false;
    lastInput = dragMoveT;
  }

  function onPointerMove(e: PointerEvent) {
    const p = localPoint(e);
    if (dragging && e.pointerId === dragPointerId) {
      const sens = dragPointerType === "mouse" ? DRAG : TOUCH_DRAG;
      const dx = p.x - dragLastX;
      dragLastX = p.x;
      dragDist += Math.abs(dx);
      target -= dx * sens;
      dragVel = dragVel * 0.6 + -dx * sens * 0.4;
      dragMoveT = performance.now();
      lastInput = dragMoveT;
      snapped = false;
    }
    lastPointerX = p.x;
    lastPointerY = p.y;
    lastPointerType = e.pointerType || "mouse";
    pointerInside = true;
    if (e.pointerType !== "mouse") return;
    if (moveX) moveX(p.x);
    if (moveY) moveY(p.y);
    if (focusState.active) {
      setHover(false);
      return;
    }
    setHover(panelAtPointer(p.x, p.y) !== null);
  }

  function onPointerUp(e?: PointerEvent) {
    if (!dragging) return;
    if (e && dragPointerId !== null && e.pointerId !== dragPointerId) return;
    dragging = false;
    if (dragPointerId !== null) {
      try {
        el.releasePointerCapture(dragPointerId);
      } catch {
        /* already released */
      }
      dragPointerId = null;
    }
    velocity = performance.now() - dragMoveT > FLICK_IDLE_MS ? 0 : dragVel;
    dragVel = 0;
    lastInput = performance.now();
    snapped = false;
    suppressClick =
      dragDist > (dragPointerType === "mouse" ? CLICK_SLOP : TOUCH_CLICK_SLOP);
    if (dragPointerType === "mouse") {
      setHover(panelAtPointer(lastPointerX, lastPointerY) !== null);
    } else {
      updateCursor();
    }
  }

  function onEnter(e: PointerEvent) {
    cachedRect = el.getBoundingClientRect();
    pointerInside = true;
    lastPointerType = e.pointerType || "mouse";
  }

  function onLeave() {
    pointerInside = false;
    setHover(false);
  }

  function onClick(e: MouseEvent) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (inputLocked()) return;
    const p = localPoint(e);
    const hit = panelAtPointer(p.x, p.y);
    if (!hit) return;
    if (centeredPanel && hit.poolIdx === centeredPanel.poolIdx) {
      pendingFocus = null;
      openFocus();
      return;
    }
    userInteracted = true;
    velocity = 0;
    target = centerForIndex(nearestIndex(scroll + hit.centerX));
    snapped = true;
    pendingFocus = { srcIndex: hit.srcIndex };
    setView(false);
  }

  function openFocus() {
    if (focusState.active || !centeredPanel) return;
    const src = sources[centeredPanel.srcIndex];
    if (!src?.tex) return;

    focusState.active = true;
    focusState.srcIndex = centeredPanel.srcIndex;
    const focusPoolIdx = centeredPanel.poolIdx;
    focusState.poolIdx = focusPoolIdx;
    target = centerForIndex(nearestIndex(scroll));

    const focusX = lastCenterX[focusPoolIdx] || 0;
    const others = pool
      .map((_, idx) => ({ idx, x: lastCenterX[idx] }))
      .filter((o) => o.idx !== focusPoolIdx && o.x !== undefined)
      .map((o) => ({ idx: o.idx, dist: Math.abs((o.x ?? 0) - focusX) }))
      .sort((a, b) => a.dist - b.dist);

    let rank = 0;
    let prevDist = -1;
    const ranked = others.map((o) => {
      if (prevDist >= 0 && o.dist - prevDist > 1) rank += 1;
      prevDist = o.dist;
      return { idx: o.idx, rank };
    });

    for (const key of LENS_FX_KEYS) {
      lensFxFull[key] = lensUniforms[key].value;
    }

    if (focusState.anim) focusState.anim.kill();
    const scaleProxy = { v: focusScale };
    const tl = gsap.timeline();
    tl.to(
      focusState,
      { lensFx: 0, duration: FOCUS.lensFade, ease: "power3.out" },
      0,
    );
    tl.to(
      scaleProxy,
      {
        v: FOCUS.centerScale,
        duration: FOCUS.focusDuration,
        ease: FOCUS.focusEase,
        onUpdate() {
          focusScale = scaleProxy.v;
        },
      },
      0,
    );
    ranked.forEach((o) => {
      tl.to(
        drop,
        { [o.idx]: 1, duration: FOCUS.cardDuration, ease: FOCUS.cardEase },
        o.rank * FOCUS.stagger,
      );
    });
    focusState.anim = tl;
    setView(false);
    options.onFocusChange(true);
  }

  function closeFocus() {
    if (!focusState.active) return;
    if (focusState.anim) focusState.anim.kill();

    const focusX = lastCenterX[focusState.poolIdx] || 0;
    const others = pool
      .map((_, idx) => ({ idx, x: lastCenterX[idx] }))
      .filter((o) => o.x !== undefined && (drop[o.idx] || 0) > 0)
      .map((o) => ({ idx: o.idx, dist: Math.abs((o.x ?? 0) - focusX) }))
      .sort((a, b) => b.dist - a.dist);

    let rank = 0;
    let prevDist = -1;
    const ranked = others.map((o) => {
      if (prevDist >= 0 && prevDist - o.dist > 1) rank += 1;
      prevDist = o.dist;
      return { idx: o.idx, rank };
    });

    options.onFocusChange(false);
    const scaleProxy = { v: focusScale };
    const tl = gsap.timeline({
      onComplete: () => {
        focusState.active = false;
        focusState.srcIndex = -1;
        updateCursor();
      },
    });
    tl.to(
      focusState,
      { lensFx: 1, duration: FOCUS.lensFade * 0.8, ease: "power3.inOut" },
      0,
    );
    tl.to(
      scaleProxy,
      {
        v: 1,
        duration: FOCUS.focusDuration * 0.85,
        ease: FOCUS.focusEase,
        onUpdate() {
          focusScale = scaleProxy.v;
        },
      },
      0,
    );
    ranked.forEach((o) => {
      tl.to(
        drop,
        {
          [o.idx]: 0,
          duration: FOCUS.cardDuration * 0.85,
          ease: FOCUS.cardEase,
        },
        o.rank * FOCUS.stagger * 0.7,
      );
    });
    focusState.anim = tl;
  }

  function playEntry() {
    if (!entryOn) {
      options.onEntryDone(true);
      return;
    }
    if (entryAnim) entryAnim.kill();
    for (let k = 0; k < pEntry.length; k++) pEntry[k] = 0;
    entryActive = true;
    entrySettled = false;
    options.onEntryDone(false);
    for (let k = 0; k < growArr.length; k++) growArr[k] = 0;
    focusState.lensFx = 0;
    target = centerForIndex(nearestIndex(scroll));
    scroll = target;
    velocity = 0;
    snapped = true;
    layout();

    const visible: number[] = [];
    for (let k = 0; k < lastCenterX.length; k++) {
      if (lastCenterX[k] !== undefined) visible.push(k);
    }

    const tl = gsap.timeline({ delay: ENTRY.delay });
    const cSrcG = centerIndex(scroll);
    const Ng = sources.length;
    const midRepG = Math.floor(REPEATS / 2);

    let lastRiseEnd = 0;
    visible.forEach((idx) => {
      let di = (idx % Ng) - cSrcG;
      if (di > Ng / 2) di -= Ng;
      if (di < -Ng / 2) di += Ng;
      const atTime = Math.abs(di) * ENTRY.stagger;
      lastRiseEnd = Math.max(lastRiseEnd, atTime + ENTRY.riseDuration);
      tl.to(
        pEntry,
        { [idx]: 1, duration: ENTRY.riseDuration, ease: ENTRY.riseEase },
        atTime,
      );
    });

    tl.call(
      () => {
        entryActive = false;
        entrySettled = true;
      },
      [],
      lastRiseEnd,
    );

    const growList: { idx: number; rank: number }[] = [];
    let maxRank = 0;
    for (let k = 0; k < lastCenterX.length; k++) {
      if (lastCenterX[k] === undefined) continue;
      if (Math.floor(k / Ng) !== midRepG) continue;
      let di = (k % Ng) - cSrcG;
      if (di > Ng / 2) di -= Ng;
      if (di < -Ng / 2) di += Ng;
      const r = Math.abs(di);
      maxRank = Math.max(maxRank, r);
      growList.push({ idx: k, rank: r });
    }
    const growRanked = growList.map((v) => ({
      idx: v.idx,
      rank: maxRank - v.rank,
    }));
    const growStart = lastRiseEnd + ENTRY.growDelay;
    let growEnd = growStart;
    tl.to(
      focusState,
      { lensFx: 1, duration: ENTRY.lensBloom, ease: ENTRY.lensBloomEase },
      growStart,
    );
    growRanked.forEach((o) => {
      const atTime = growStart + o.rank * ENTRY.growStagger;
      growEnd = Math.max(growEnd, atTime + ENTRY.growDuration);
      tl.to(
        growArr,
        { [o.idx]: 1, duration: ENTRY.growDuration, ease: ENTRY.growEase },
        atTime,
      );
    });
    tl.call(
      () => {
        entrySettled = false;
        for (let k = 0; k < growArr.length; k++) growArr[k] = 1;
        options.onEntryDone(true);
        updateCursor();
      },
      [],
      growEnd,
    );
    entryAnim = tl;
  }

  function step(direction: number) {
    if (inputLocked()) return;
    userInteracted = true;
    velocity = 0;
    pendingFocus = null;
    target = centerForIndex(nearestIndex(scroll) + direction);
    snapped = true;
    lastInput = performance.now();
  }

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("click", onClick);

  let raf = 0;
  let running = true;
  let visible = true;

  function tick() {
    if (!running) return;
    if (!visible || document.hidden) {
      raf = 0;
      return;
    }
    if (!dragging) {
      target += velocity;
      velocity *= FRICTION;
      if (Math.abs(velocity) < 0.05) velocity = 0;
      if (
        !snapped &&
        !focusState.active &&
        performance.now() - lastInput > SNAP_IDLE_MS
      ) {
        target = centerForIndex(nearestIndex(scroll));
        snapped = true;
      }
    }
    const follow =
      dragging && dragPointerType !== "mouse"
        ? TOUCH_EASE
        : snapped && !pendingFocus
          ? SNAP_EASE
          : EASE;
    scroll += (target - scroll) * follow;

    const ci = centerIndex(scroll);
    if (ci !== lastCenter) {
      lastCenter = ci;
      options.onActiveChange(ci);
    }

    const rawSpeed = scroll - prevScroll;
    prevScroll = scroll;
    const norm = Math.min(1, Math.abs(rawSpeed) / Math.max(1, SHRINK_MAX));
    const k = norm > scrollEnergy ? SHRINK_ATTACK : SHRINK_DECAY;
    scrollEnergy += (norm - scrollEnergy) * k;

    layout();
    refreshHover();

    if (pendingFocus && !focusState.active) {
      if (Math.abs(target - scroll) < 0.5) {
        const pf = pendingFocus;
        pendingFocus = null;
        if (centeredPanel && centeredPanel.srcIndex === pf.srcIndex) {
          openFocus();
        }
      }
    }

    const aspect = W / H;
    const isMobile = W < MOBILE_BREAKPOINT;
    const isTablet = W <= TABLET_BREAKPOINT;
    lensUniforms.uCenter.value.set(LENS.posX, LENS.posY);
    lensUniforms.uSizeX.value = isMobile
      ? aspect * 0.54
      : isTablet
        ? aspect * 0.42
        : LENS.sizeX;
    lensUniforms.uSizeY.value = isMobile
      ? 0.56
      : isTablet
        ? 0.46
        : LENS.sizeY;
    lensUniforms.uAspect.value = aspect;
    lensUniforms.uTime.value = performance.now() * 0.001;
    const rad = (a: number) => (a * Math.PI) / 180;
    lensUniforms.uRotation.value =
      rad(LENS.rotation) + rad(LENS.spin) * (performance.now() * 0.001);
    const fx = focusState.lensFx;
    for (const key of LENS_FX_KEYS) {
      const fullValue =
        key === "uZoom"
          ? isMobile
            ? MOBILE_LENS_ZOOM
            : isTablet
              ? TABLET_LENS_ZOOM
              : LENS.zoom
          : lensFxFull[key];
      lensUniforms[key].value = fullValue * fx;
    }

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(lensScene, lensCam);
    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (!running || raf) return;
    raf = requestAnimationFrame(tick);
  }

  startLoop();

  // Load, decode off-thread, and pre-upload textures before starting the entry timeline
  let loadedCount = 0;
  let entryStarted = false;

  function triggerEntryIfReady() {
    if (entryStarted || !running) return;
    entryStarted = true;
    window.clearTimeout(entryTimeout);
    if (entryOn) playEntry();
    else options.onEntryDone(true);
  }

  const entryTimeout = window.setTimeout(triggerEntryIfReady, 1200);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  items.forEach((img, index) => {
    const s = at(sources, index);
    loader.load(
      img.src,
      async (tex) => {
        if (tex.image instanceof HTMLImageElement) {
          try {
            await tex.image.decode();
          } catch {
            /* ignore decode errors */
          }
        }
        if (!running) {
          tex.dispose();
          return;
        }
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        if (!s.locked && tex.image) {
          s.aspect = tex.image.width / tex.image.height;
          itemAspects[index] = s.aspect;
          PANEL_H = panelHFor();
        }
        if (tex.image) {
          const sourceAspect = tex.image.width / tex.image.height;
          const fitX = Math.min(1, s.aspect / sourceAspect);
          const fitY = Math.min(1, sourceAspect / s.aspect);
          tex.repeat.set(fitX, fitY);
          tex.offset.set((1 - fitX) / 2, (1 - fitY) / 2);
        }
        renderer.initTexture(tex);
        s.tex = tex;
        recomputeTotal();
        if (!userInteracted) {
          scroll = centerForIndex(0);
          target = scroll;
        }
        loadedCount += 1;
        if (loadedCount >= sources.length) {
          triggerEntryIfReady();
        }
      },
      undefined,
      () => {
        if (!running) return;
        s.aspect = s.aspect || PORTRAIT_ASPECT;
        loadedCount += 1;
        if (loadedCount >= sources.length) {
          triggerEntryIfReady();
        }
      },
    );
  });

  function onResize() {
    cachedRect = el.getBoundingClientRect();
    const nextW = Math.max(1, mount.clientWidth);
    const nextH = Math.max(1, mount.clientHeight);
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (nextW === W && nextH === H && nextRatio === currentDpr) return;

    W = nextW;
    H = nextH;
    currentDpr = nextRatio;
    PANEL_H = panelHFor();
    recomputeTotal();
    renderer.setPixelRatio(currentDpr);
    renderer.setSize(W, H);
    camera.left = -W / 2;
    camera.right = W / 2;
    camera.top = H / 2;
    camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    rt.setSize(W * currentDpr, H * currentDpr);
    lensUniforms.uRes.value.set(W * currentDpr, H * currentDpr);
    if (!userInteracted) {
      scroll = centerForIndex(0);
      target = scroll;
    }
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(mount);
  const intersection = new IntersectionObserver(([entry]) => {
    const box = entry?.boundingClientRect;
    if (!box || (box.width === 0 && box.height === 0)) return;
    visible = entry?.isIntersecting ?? true;
    if (visible) startLoop();
  });
  intersection.observe(mount);
  const onVisibility = () => {
    if (!document.hidden) startLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  function destroy() {
    running = false;
    window.clearTimeout(entryTimeout);
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("click", onClick);
    if (focusState.anim) focusState.anim.kill();
    if (entryAnim) entryAnim.kill();
    if (cursorElement) gsap.killTweensOf(cursorElement);
    renderer.dispose();
    rt.dispose();
    lensQuad.geometry.dispose();
    lensMat.dispose();
    sharedPlaneGeo.dispose();
    placeholderTex.dispose();
    pool.forEach((p) => {
      p.mat.dispose();
    });
    sources.forEach((s) => {
      s.tex?.dispose();
    });
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return {
    closeFocus,
    next: () => step(1),
    previous: () => step(-1),
    destroy,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Infinite image row with a liquid-glass WebGL lens in a viewport-height stage. */
export function LiquidGlassCarousel({
  items = liquidGlassCarouselDefaultItems,
  categoryTitle,
  panelHeight = 600,
  gap = 12,
  background = "#ffffff",
  entry = true,
  className,
  style,
  onActiveChange,
  onFocusChange,
}: LiquidGlassCarouselProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LiquidGlassCarouselHandle | null>(null);
  const categoryRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const counterRef = useRef<HTMLParagraphElement>(null);
  const revealPlayedRef = useRef(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [entryDone, setEntryDone] = useState(!entry);
  const [failed, setFailed] = useState(false);
  const labelId = useId();
  const liveId = useId();
  const current = items[active] ?? items[0];
  const onActiveChangeRef = useRef(onActiveChange);
  const onFocusChangeRef = useRef(onFocusChange);

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
    onFocusChangeRef.current = onFocusChange;
  }, [onActiveChange, onFocusChange]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || items.length === 0) return;

    const engine = createCarousel(mount, cursorRef.current, {
      items,
      panelHeight,
      gap,
      background,
      entry,
      onActiveChange: (index) => {
        setActive(index);
        onActiveChangeRef.current?.(index);
      },
      onFocusChange: (open) => {
        setFocused(open);
        onFocusChangeRef.current?.(open);
      },
      onEntryDone: setEntryDone,
    });
    if (!engine) {
      setFailed(true);
      return;
    }
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [items, panelHeight, gap, background, entry]);

  useEffect(() => {
    const title = titleRef.current;
    const counter = counterRef.current;
    const category = categoryRef.current;
    if (!title || !counter) return;

    const reduced = prefersReducedMotion();
    const elements = category ? [category, title, counter] : [title, counter];
    gsap.set(elements, { xPercent: -50 });

    if (!entryDone && entry && !reduced) {
      gsap.set(elements, { autoAlpha: 0 });
      revealPlayedRef.current = false;
      return;
    }

    const y = focused ? window.innerHeight * 0.05 : 0;
    if (entryDone && !focused && !revealPlayedRef.current) {
      revealPlayedRef.current = true;
      gsap.fromTo(
        category ? [category, title] : title,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: reduced ? 0 : 1.6, ease: "power2.out" },
      );
      gsap.fromTo(
        counter,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: reduced ? 0 : 1.6,
          ease: "power2.out",
          delay: reduced ? 0 : 0.18,
        },
      );
      return;
    }

    if (category) {
      gsap.to(category, {
        y: -y,
        autoAlpha: focused ? 0 : 1,
        duration: reduced ? 0 : 0.4,
        ease: "power3.out",
      });
    }
    gsap.to(title, {
      y,
      autoAlpha: 1,
      duration: reduced ? 0 : 0.4,
      ease: "power3.out",
    });
    gsap.to(counter, {
      autoAlpha: focused ? 0 : 1,
      duration: reduced ? 0 : 0.4,
      ease: "power3.out",
    });
  }, [focused, entryDone, entry, categoryTitle]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      engineRef.current?.next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      engineRef.current?.previous();
    } else if (event.key === "Escape") {
      event.preventDefault();
      engineRef.current?.closeFocus();
    }
  };

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ background, color: "#111111", ...style }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      onKeyDown={onKeyDown}
    >
      <p id={labelId} className="sr-only">
        Liquid glass project carousel
      </p>
      <p id={liveId} className="sr-only" aria-live="polite">
        {current?.title ?? ""}, {pad(active + 1)} of {pad(items.length)}
        {focused ? ", focused" : ""}
      </p>

      <WebGLErrorBoundary
        fallback={
          <WebGLFallback
            className="absolute inset-0"
            message="This carousel needs WebGL, which is unavailable in this browser."
          />
        }
      >
        {failed ? (
          <WebGLFallback
            className="absolute inset-0"
            message="This carousel needs WebGL, which is unavailable in this browser."
          />
        ) : (
          <div ref={mountRef} className="absolute inset-0" />
        )}
      </WebGLErrorBoundary>

      {categoryTitle && (
        <h1
          ref={categoryRef}
          className="font-main pointer-events-none absolute top-[20%] sm:top-[12%] left-1/2 z-10 m-0 text-center text-4xl tracking-[0.12em] whitespace-nowrap text-black uppercase opacity-0 sm:text-7xl"
        >
          {categoryTitle}
        </h1>
      )}
      <div className="pointer-events-none absolute bottom-[20%] sm:bottom-[12%] left-1/2 z-10 m-0 flex flex-col gap-2">
        <p
          ref={titleRef}
          className="text-center text-[15px] font-medium tracking-[-0.02em] text-black uppercase opacity-0 sm:text-lg"
        >
          {current?.title}
        </p>
        <p
          ref={counterRef}
          className="text-center text-[13px] font-medium tracking-[-0.02em] text-black tabular-nums opacity-0 sm:text-[15px]"
        >
          {pad(active + 1)}/{pad(items.length)}
        </p>
      </div>

      <div
        ref={cursorRef}
        className="pointer-events-none absolute top-0 left-0 z-20 text-[13px] font-medium text-black mix-blend-exclusion"
      >
        View
      </div>

      <button
        type="button"
        onClick={() => engineRef.current?.closeFocus()}
        aria-label="Close focused project"
        className="absolute top-[4.5%] right-[4%] z-20 text-[13px] font-medium text-black mix-blend-exclusion transition-opacity duration-300"
        style={{
          opacity: focused ? 1 : 0,
          pointerEvents: focused ? "auto" : "none",
        }}
      >
        Close
      </button>
    </div>
  );
}

export default LiquidGlassCarousel;

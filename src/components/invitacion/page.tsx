'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  RefObject,
} from 'react';
import '@/app/styles.css';
import RSVPForm from '../forms/confirm-asistance';
import MessageSection from '../forms/message';

/* =========================================================
 *  Types
 * ======================================================= */

interface Guest {
  name: string;
  phone: string;
  dietRestriction: 'no' | 'si';
  dietDetail: string;
}

interface DiamondCellConfig {
  r: number;
  c: number;
  color: string;
  baseX: number;
  baseY: number;
  baseRot: number;
  bscale: number;
  dx: number;
  dy: number;
  rot: number;
  duration: number;
  delay: number;
}

/* =========================================================
 *  useImageSlot — simple drag-and-drop image hook
 *  Convierte el custom element <image-slot> en un hook React.
 *  En Next.js no hay acceso al sidecar de omelette, por lo
 *  que actúa como slot de sesión (state en memoria + src fallback).
 * ======================================================= */

const ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const MAX_DIM = 1200;

async function toDataUrl(file: File, targetW: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
    const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL('image/webp', 0.85);
  } finally {
    (bitmap as unknown as { close?: () => void }).close?.();
  }
}

function useImageSlot(slotId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const depthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ingest = useCallback(async (file: File, containerW: number) => {
    if (!ACCEPT_TYPES.includes(file.type)) return;
    const dataUrl = await toDataUrl(file, containerW);
    setUrl(dataUrl);
  }, []);

  const handlers = useMemo(
    () => ({
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        depthRef.current++;
        setDragOver(true);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave: (e: React.DragEvent) => {
        e.stopPropagation();
        if (--depthRef.current <= 0) { depthRef.current = 0; setDragOver(false); }
      },
      onDrop: (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        depthRef.current = 0;
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) ingest(file, (e.currentTarget as HTMLElement).clientWidth || MAX_DIM);
      },
      onClick: () => inputRef.current?.click(),
    }),
    [ingest],
  );

  const inputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept: ACCEPT_TYPES.join(','),
    style: { display: 'none' } as React.CSSProperties,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const el = inputRef.current?.parentElement;
        ingest(file, el?.clientWidth || MAX_DIM);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
  };

  return { url, dragOver, handlers, inputProps, clear: () => setUrl(null) };
}

/* =========================================================
 *  ImageSlot component
 * ======================================================= */

interface ImageSlotProps {
  id: string;
  src: string;
  shape?: 'rect' | 'rounded' | 'circle' | 'pill';
  radius?: number;
  mask?: string;
  fit?: 'cover' | 'contain' | 'fill';
  style?: React.CSSProperties;
  className?: string;
}

function ImageSlot({
  id,
  src,
  shape = 'rounded',
  radius = 12,
  mask,
  fit = 'cover',
  style,
  className,
}: ImageSlotProps) {
  let borderRadius = '';
  if (!mask) {
    if (shape === 'circle') borderRadius = '50%';
    else if (shape === 'pill') borderRadius = '9999px';
    else if (shape === 'rounded') borderRadius = `${radius}px`;
  }

  const containerStyle: React.CSSProperties = {
    ...style,
    borderRadius: borderRadius || undefined,
    clipPath: mask || undefined,
    position: 'relative',
    overflow: 'hidden',
    display: 'block',
  };

  return (
    <div className={`image-slot-wrapper ${className ?? ''}`} style={containerStyle}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
      />
    </div>
  );
}

/* =========================================================
 *  HeroBannerGL — WebGL shader
 *  Convertido 1:1 desde hero-banner-gl.jsx
 * ======================================================= */

const HERO_VERTEX_SHADER = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const HERO_FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_tex;
  uniform float u_time;
  uniform vec2 u_res;
  uniform float u_imgY0;
  varying vec2 v_uv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float hash1(float x) { return fract(sin(x) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
  float peak(float t, float a, float b) {
    float mid = (a + b) * 0.5; float halfRange = (b - a) * 0.5;
    return smoothstep(0.0, 1.0, 1.0 - abs(t - mid) / halfRange);
  }

  void main() {
    vec2 cuv = v_uv;
    float cycle = mod(u_time, 7.0);
    float intensity = 0.0;
    intensity = max(intensity, 0.35 * peak(cycle, 1.2, 1.8));
    intensity = max(intensity, peak(cycle, 3.5, 5.5));
    float flick = step(0.94, hash1(floor(u_time * 18.0)));
    intensity = clamp(intensity + flick * 0.18 * step(3.3, cycle) * step(cycle, 5.7), 0.0, 1.0);

    float imgMask = step(u_imgY0, cuv.y);
    vec2 iuv = vec2(cuv.x, (cuv.y - u_imgY0) / max(1.0 - u_imgY0, 0.0001));

    float zoneTime = floor(u_time * 3.0);
    float zoneId = floor(iuv.y * 5.0);
    float zoneActive = step(0.65, hash1(zoneId + zoneTime * 0.27));
    float blockTime = floor(u_time * 14.0);
    float bandFreq = 70.0 + hash1(blockTime) * 80.0;
    float band = floor(iuv.y * bandFreq + hash1(blockTime + 1.7) * 4.0);
    float bandGate = step(0.62, hash1(band + blockTime * 0.31));
    float bandShift = (hash1(band + blockTime) - 0.5) * 0.14 * intensity * bandGate * zoneActive;
    iuv.x += bandShift;

    float waveStrength = 0.008 * intensity;
    iuv.x += sin(iuv.y * 22.0 + u_time * 4.0) * waveStrength;
    iuv.y += sin(iuv.x * 14.0 + u_time * 3.0) * waveStrength * 0.4;

    float warpStrength = 0.014 * intensity;
    vec2 warp = vec2(fbm(iuv * 5.0 + u_time * 0.5), fbm(iuv * 5.0 - u_time * 0.4)) - 0.5;
    iuv += warp * warpStrength;

    float ca = 0.024 * intensity * (0.6 + 0.4 * noise(vec2(iuv.y * 6.0, u_time * 1.5)));
    vec4 col;
    col.r = texture2D(u_tex, iuv + vec2(ca, ca * 0.25)).r;
    col.g = texture2D(u_tex, iuv).g;
    col.b = texture2D(u_tex, iuv - vec2(ca, ca * 0.25)).b;
    col.a = texture2D(u_tex, iuv).a;
    col *= imgMask;

    float bgFactor = (1.0 - imgMask);
    float bgZoneId = floor(cuv.y * 6.0);
    float bgZoneActive = step(0.7, hash1(bgZoneId + zoneTime * 0.19 + 13.0));
    float bgBand = floor(cuv.y * 90.0 + hash1(blockTime + 0.7) * 5.0);
    float bgBandGate = step(0.74, hash1(bgBand + blockTime + 4.0));
    vec3 bgTint = mix(vec3(0.486, 0.376, 0.745), vec3(0.0, 0.333, 0.729), hash1(bgBand));
    float bgBandStrength = 0.55 * intensity * bgBandGate * bgZoneActive;
    vec3 bgArtifact = bgTint * bgBandStrength;
    float bgAlpha = bgBandStrength;

    float grain = (hash(cuv * vec2(1300.0, 700.0) + u_time * 17.0) - 0.5);
    float grainAmt = 0.02 + 0.16 * intensity;
    col.rgb += grain * grainAmt;
    bgArtifact += grain * grainAmt * bgFactor;
    bgAlpha += abs(grain) * grainAmt * bgFactor * 0.6;

    float sl = sin(cuv.y * u_res.y * 1.6) * 0.5 + 0.5;
    col.rgb *= mix(1.0, mix(0.85, 1.0, sl), 0.05 + 0.45 * intensity);
    bgArtifact *= mix(0.8, 1.05, sl);

    float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    col.rgb = mix(col.rgb, mix(vec3(gray), col.rgb, 1.5), intensity * 0.45);

    float sweepGate = step(0.96, hash1(floor(u_time * 1.1)));
    float sweepY = fract(u_time * 0.7);
    float sweepProx = smoothstep(0.06, 0.0, abs(cuv.y - sweepY));
    vec3 sweepCol = vec3(1.0, 0.3, 0.85);
    col.rgb += sweepCol * sweepGate * sweepProx * 0.35 * intensity * imgMask;
    bgArtifact += sweepCol * sweepGate * sweepProx * 0.45 * intensity * bgFactor;
    bgAlpha += sweepGate * sweepProx * 0.45 * intensity * bgFactor;

    vec4 outColor = col + vec4(bgArtifact, 0.0) * bgFactor;
    outColor.a = max(col.a, clamp(bgAlpha, 0.0, 1.0) * bgFactor);
    gl_FragColor = outColor;
  }
`;

interface HeroBannerGLProps {
  src: string;
  className?: string;
  bgPadTop?: number;
}

function HeroBannerGL({ src, className = '', bgPadTop = 0 }: HeroBannerGLProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: true,
      antialias: false,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) { setFailed(true); return; }

    const compile = (type: number, source: string): WebGLShader | null => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, HERO_VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, HERO_FRAGMENT_SHADER);
    if (!vs || !fs) { setFailed(true); return; }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      setFailed(true); return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime  = gl.getUniformLocation(program, 'u_time')!;
    const uRes   = gl.getUniformLocation(program, 'u_res')!;
    const uTex   = gl.getUniformLocation(program, 'u_tex')!;
    const uImgY0 = gl.getUniformLocation(program, 'u_imgY0')!;
    gl.uniform1i(uTex, 0);
    const imgY0 = bgPadTop / (1 + bgPadTop);
    gl.uniform1f(uImgY0, imgY0);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([21, 2, 22, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let imageAspect = 1800 / 1044;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      imageAspect = img.naturalWidth / img.naturalHeight;
      resize();
      setReady(true);
    };
    img.onerror = () => setFailed(true);
    img.src = src;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = container.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const imageH = w / imageAspect;
      const h = imageH * (1 + bgPadTop);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      container.style.height = h + 'px';
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
    };
  }, [src, bgPadTop]);

  if (failed) {
    return <img className={`hero-banner ${className}`} src={src} alt="Juli" />;
  }

  return (
    <div ref={containerRef} className={`hero-banner-gl ${className} ${ready ? 'is-ready' : ''}`}>
      <canvas ref={canvasRef} className="hero-banner-gl-canvas" />
    </div>
  );
}

/* =========================================================
 *  Helpers
 * ======================================================= */

function useInView(ref: RefObject<Element | null>, opts: IntersectionObserverInit = { threshold: 0.25 }): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setInView(true);
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return inView;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface OdometerNumberProps {
  value: number;
  duration?: number;
  trigger: boolean;
  pad?: number;
}

function OdometerNumber({ value, duration = 1400, trigger, pad = 0 }: OdometerNumberProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.floor(easeOutCubic(t) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, value, duration]);
  const text = pad ? String(display).padStart(pad, '0') : String(display);
  return <span>{text}</span>;
}

interface DigitRollProps {
  digit: number;
  delay?: number;
  trigger: boolean;
}

function DigitRoll({ digit, delay = 0, trigger }: DigitRollProps) {
  const [rolled, setRolled] = useState(false);
  useEffect(() => {
    if (trigger) {
      const t = setTimeout(() => setRolled(true), delay);
      return () => clearTimeout(t);
    }
  }, [trigger, delay]);
  return (
    <span className="digit-roll">
      <span
        className="digit-stack"
        style={{ transform: `translateY(${rolled ? -digit * 10 : 0}%)` }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="digit-cell">{i}</span>
        ))}
      </span>
    </span>
  );
}

interface RollingNumberProps {
  value: string | number;
  trigger: boolean;
  baseDelay?: number;
}

function RollingNumber({ value, trigger, baseDelay = 0 }: RollingNumberProps) {
  const chars = String(value).split('');
  return (
    <span className="rolling-number">
      {chars.map((c, i) =>
        /\d/.test(c)
          ? <DigitRoll key={i} digit={parseInt(c, 10)} delay={baseDelay + i * 90} trigger={trigger} />
          : <span key={i} className="digit-sep">{c}</span>
      )}
    </span>
  );
}

/* =========================================================
 *  Diamond
 * ======================================================= */

interface DiamondProps {
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

function Diamond({ color = 'currentColor', strokeWidth = 1.4, className = '', style = {} }: DiamondProps) {
  return (
    <svg
      viewBox="0 0 100 220"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`diamond ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path d="M50 4 L4 88 L50 216 L96 88 Z" />
      <path d="M50 4 L50 216" />
      <path d="M4 88 L50 76 L96 88 L50 100 Z" />
    </svg>
  );
}

interface DiamondFieldProps {
  cols?: number;
  rows?: number;
}

function DiamondField({ cols = 16, rows = 14 }: DiamondFieldProps) {
  const colors = ['var(--celeste)', 'var(--red)', 'var(--magenta)', 'var(--blue)', 'var(--paper)'];

  const cells = useMemo<DiamondCellConfig[]>(() => {
    const out: DiamondCellConfig[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = (r * 31 + c * 17) % colors.length;
        const h = ((r * 73856093) ^ (c * 19349663)) >>> 0;
        const rand1 = (h % 1000) / 1000;
        const rand2 = ((h >> 10) % 1000) / 1000;
        const rand3 = ((h >> 20) % 1000) / 1000;
        const rand4 = ((h >> 5) % 1000) / 1000;
        out.push({
          r, c,
          color: colors[seed] ?? '',
          baseX: (rand1 - 0.5) * 80,
          baseY: (rand4 - 0.5) * 80,
          baseRot: (rand3 - 0.5) * 30,
          bscale: 0.7 + rand4 * 0.7,
          dx: (rand1 - 0.5) * 22,
          dy: (rand2 - 0.5) * 22,
          rot: (rand3 - 0.5) * 26,
          duration: 4 + rand1 * 6,
          delay: rand2 * -10,
        });
      }
    }
    return out;
  }, [cols, rows]);

  return (
    <div
      className="diamond-lattice"
      aria-hidden="true"
      style={{ '--cols': cols } as React.CSSProperties}
    >
      <div className="diamond-lattice-track">
        {[0, 1].map((rep) => (
          <div className="diamond-lattice-tile" key={rep}>
            {cells.map((cell, i) => (
              <div
                key={`${rep}-${i}`}
                className="diamond-cell"
                style={{
                  gridColumn: cell.c + 1,
                  gridRow: cell.r + 1,
                  '--bx': `${cell.baseX}%`,
                  '--by': `${cell.baseY}%`,
                  '--brot': `${cell.baseRot}deg`,
                  '--bscale': cell.bscale,
                  '--dx': `${cell.dx}px`,
                  '--dy': `${cell.dy}px`,
                  '--rot': `${cell.rot}deg`,
                  animationDuration: `${cell.duration}s`,
                  animationDelay: `${cell.delay}s`,
                } as React.CSSProperties}
              >
                <Diamond color={cell.color} strokeWidth={1.4} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
 *  MARQUEE
 * ======================================================= */

interface MarqueeProps {
  items?: string[];
  reverse?: boolean;
}

function Marquee({
  items = ['JULI 15', '27 · 06 · 2026', 'SUMMUM', 'LAS VARILLAS', '20 HS', 'JULI 15', '27 · 06 · 2026', 'SUMMUM'],
  reverse = false,
}: MarqueeProps) {
  return (
    <div className={`marquee ${reverse ? 'marquee--rev' : ''}`}>
      <div className="marquee-track">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-text glitchy-mild">{t}</span>
            <span className="marquee-dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
 *  HERO
 * ======================================================= */

// src de la imagen hero (base64 grande — mismo que el original)
const HERO_BANNER_SRC = '/assets/juli-banner.webp';

function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <Marquee />
      <div className="hero-grid">
        {/* Left rail */}
        <div className="hero-side">
          <span className="hero-side-text">JULIA · RICCI · MIS QUINCE · SÁBADO 27.06.2026 · SUMMUM · LAS VARILLAS</span>
        </div>

        {/* Center */}
        <div className="hero-center">
          <div
            className="diamond-field-wrap"
            style={{
              transform: `translate3d(${mouse.x * -10}px, ${mouse.y * -8 + scrollY * -0.06}px, 0)`,
            }}
          >
            <DiamondField cols={16} rows={14} />
          </div>

          <div className="jxv-badge">
            <span className="jxv-mark">JXV</span>
            <span className="jxv-sub">FIFTEEN</span>
          </div>

          <div className="lockup">
            <span className="lockup-word">JULIA</span>
            <span className="lockup-mark"><Diamond color="var(--paper)" strokeWidth={1.8} /></span>
            <span className="lockup-word">RICCI</span>
          </div>

          <div
            className="logo-stack"
            style={{ transform: `translate3d(${mouse.x * 8}px, ${scrollY * -0.18 + mouse.y * 6}px, 0)` }}
          >
            <h1 className="logo-main">
              <span className="logo-word logo-word--juli">
                JULI
                <span className="logo-fifteen-overlay">FIFTEEN</span>
              </span>
            </h1>
          </div>

          <div className="hero-bottom-row">
            <div className="hero-bottom-block">
              <span className="hb-key">SAVE THE DATE</span>
              <span className="hb-val">27 · 06 · 2026</span>
            </div>
            <div className="hero-bottom-block hero-bottom-block--center">
              <Diamond color="var(--accent)" strokeWidth={1.6} />
            </div>
            <div className="hero-bottom-block hero-bottom-block--right">
              <span className="hb-key">SUMMUM</span>
              <span className="hb-val">20 HS</span>
            </div>
          </div>

          {/* Banner WebGL */}
          <div
            className="hero-banner-wrap"
            style={{ transform: `translate3d(calc(-50% + ${mouse.x * -10}px), ${mouse.y * -6}px, 0)`
          }}
          >
            <HeroBannerGL src={HERO_BANNER_SRC} bgPadTop={0.4} />
          </div>
        </div>

        {/* Right rail */}
        <div className="hero-side hero-side--right">
          <span className="hero-side-text">LAS VARILLAS · CÓRDOBA · AVELLANEDA 163 · 20HS · 27.06.2026</span>
        </div>
      </div>

      <div className="scroll-cue">
        <span>SCROLL</span>
        <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
          <path d="M7 1V20M7 20L1 14M7 20L13 14" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
    </section>
  );
}

/* =========================================================
 *  DATE SECTION
 * ======================================================= */

interface CountdownCellProps {
  value: number;
  label: string;
  trigger: boolean;
  delay: number;
}

function CountdownCell({ value, label, trigger, delay }: CountdownCellProps) {
  const [display, setDisplay] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const initialValueRef = useRef<number | null>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const flashable = label === 'SEG' || label === 'MIN';

  useEffect(() => {
    if (!trigger || revealed) return;
    if (initialValueRef.current === null) initialValueRef.current = value;
    const target = initialValueRef.current;
    let raf: number;
    const startAt = performance.now() + delay;
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / duration));
      setDisplay(Math.floor(easeOutCubic(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setRevealed(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!revealed) return;
    setDisplay(value);
    if (flashable && valueRef.current) {
      const el = valueRef.current;
      el.classList.remove('glitchy-flash');
      void el.offsetWidth;
      el.classList.add('glitchy-flash');
    }
  }, [value, revealed, flashable]);

  return (
    <div className="cd-cell">
      <div ref={valueRef} className="cd-value">{String(display).padStart(2, '0')}</div>
      <div className="cd-label">{label}</div>
    </div>
  );
}

function DateSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { threshold: 0.35 });

  const target = useMemo(() => new Date('2026-06-27T20:00:00-03:00').getTime(), []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const mins  = Math.floor((diff / 60000) % 60);
  const secs  = Math.floor((diff / 1000) % 60);

  return (
    <section className="date-section" ref={ref}>
      <div className="date-eyebrow">
        <span className="dot-pulse"></span>
        <span>SAVE THE DATE</span>
      </div>

      <div className="date-stack">
        <div className="date-row">
          <span className="date-label">SÁBADO</span>
          <span className="date-mega">
            <RollingNumber value="27" trigger={inView} baseDelay={0} />
          </span>
        </div>
        <div className="date-row date-row--mid">
          <span className="date-mega date-mega--accent">
            <span className="date-month">JUNIO</span>
          </span>
        </div>
        <div className="date-row date-row--end">
          <span className="date-mega">
            <RollingNumber value="2026" trigger={inView} baseDelay={400} />
          </span>
          <span className="date-time">
            <span className="date-time-num">20</span>
            <span className="date-time-unit">HS</span>
          </span>
        </div>
      </div>

      <div className="countdown">
        <div className="countdown-label">FALTAN</div>
        <div className="countdown-grid">
          <CountdownCell value={days}  label="DÍAS"  trigger={inView} delay={800} />
          <CountdownCell value={hours} label="HORAS" trigger={inView} delay={950} />
          <CountdownCell value={mins}  label="MIN"   trigger={inView} delay={1100} />
          <CountdownCell value={secs}  label="SEG"   trigger={inView} delay={1250} />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 *  GALLERY BAND
 * ======================================================= */

function GalleryBand() {
  return (
    <section className="gallery">
      <Marquee items={['JULI · FIFTEEN', '27 · JUNIO · 2026', 'SUMMUM', 'JULI · FIFTEEN', '27 · JUNIO · 2026']} />
      <div className="gallery-grid">
        <div className="gallery-cell gallery-cell--tall">
          <ImageSlot id="gal-1" shape="rect"  src="/assets/juli-01.jpg" style={{ width: '100%', height: '100%' }} />
          <span className="gallery-tag">01 / FULL BODY</span>
        </div>
        <div className="gallery-cell gallery-cell--wide">
          <ImageSlot id="gal-2" shape="rect"  src="/assets/juli-02.jpg" style={{ width: '100%', height: '100%' }} />
          <span className="gallery-tag">02 / MOVEMENT</span>
        </div>
        <div className="gallery-cell">
          <ImageSlot id="gal-3" shape="rect"  src="/assets/juli-03.jpg" style={{ width: '100%', height: '100%' }} />
          <span className="gallery-tag">03 / CLOSE UP</span>
        </div>
        <div className="gallery-cell gallery-cell--square">
          <ImageSlot id="gal-4" shape="rect"  src="/assets/juli-04.jpg" style={{ width: '100%', height: '100%' }} />
          <span className="gallery-tag">04 / GAZE</span>
        </div>
      </div>
      <Marquee reverse items={['LAS VARILLAS', 'CÓRDOBA', 'SUMMUM', '20 HS', 'LAS VARILLAS', 'CÓRDOBA', 'SUMMUM']} />
    </section>
  );
}

/* =========================================================
 *  LOCATION
 * ======================================================= */

function LocationSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { threshold: 0.2 });

  return (
    <section className="location" ref={ref}>
      <div className="loc-left">
        <div className="loc-eyebrow">/01 — DONDE</div>
        <h2 className={`loc-title ${inView ? 'is-in' : ''}`}>
          <span className="loc-line"><span>SUM</span></span>
          <span className="loc-line"><span>MUM</span></span>
        </h2>
        <div className="loc-meta">
          <div className="loc-meta-row">
            <span className="loc-key">DIRECCIÓN</span>
            <span className="loc-val">Avellaneda 163</span>
          </div>
          <div className="loc-meta-row">
            <span className="loc-key">CIUDAD</span>
            <span className="loc-val">Las Varillas, Córdoba</span>
          </div>
          <div className="loc-meta-row">
            <span className="loc-key">FECHA</span>
            <span className="loc-val">Sábado 27 · Junio · 2026</span>
          </div>
          <div className="loc-meta-row">
            <span className="loc-key">HORA</span>
            <span className="loc-val">20:00 HS</span>
          </div>
        </div>
        <a
          className="loc-cta"
          href="https://share.google/3UekuZ5N6jOy9VCz4"
          target="_blank"
          rel="noreferrer"
        >
          <span>VER EN MAPA</span>
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </a>
      </div>

      <div className="loc-right">
        <div className="loc-map">
          <iframe
            src="https://maps.google.com/maps?q=Avellaneda+163,+Las+Varillas,+C%C3%B3rdoba&t=&z=15&ie=UTF8&iwloc=&output=embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Summum location"
          />
          <div className="loc-map-overlay" />
          <div className="loc-pin">
            <div className="loc-pin-dot" />
            <div className="loc-pin-pulse" />
            <div className="loc-pin-label">SUMMUM</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 *  RSVP
 * ======================================================= */

const blankGuest = (): Guest => ({ name: '', phone: '', dietRestriction: 'no', dietDetail: '' });

interface GuestCardProps {
  index: number;
  label: string;
  guest: Guest;
  onChange: (field: keyof Guest, value: string) => void;
  onRemove?: () => void;
}

function GuestCard({ index, label, guest, onChange, onRemove }: GuestCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { threshold: 0.1 });

  return (
    <div ref={cardRef} className={`guest-card ${inView ? 'is-in' : ''}`}>
      <div className="guest-card-head">
        <span className="guest-card-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="guest-card-label">{label}</span>
        {onRemove && (
          <button type="button" className="guest-card-remove" onClick={onRemove} aria-label="Quitar">
            ✕
          </button>
        )}
      </div>

      <div className="guest-card-body">
        <FieldInput
          label="NOMBRE Y APELLIDO"
          value={guest.name}
          onChange={(v) => onChange('name', v)}
          placeholder="Nombre completo"
          required
        />
        <FieldInput
          label="TELÉFONO"
          value={guest.phone}
          onChange={(v) => onChange('phone', v)}
          placeholder="+54 9 ..."
          type="tel"
          required
        />
        <div className="field">
          <label className="field-label">¿RESTRICCIÓN ALIMENTARIA?</label>
          <div className="seg">
            {(['no', 'si'] as const).map((opt) => (
              <button
                type="button"
                key={opt}
                className={`seg-btn ${guest.dietRestriction === opt ? 'is-on' : ''}`}
                onClick={() => onChange('dietRestriction', opt)}
              >
                {opt === 'no' ? 'NO' : 'SÍ'}
              </button>
            ))}
          </div>
        </div>
        {guest.dietRestriction === 'si' && (
          <FieldInput
            label="¿CUÁL?"
            value={guest.dietDetail}
            onChange={(v) => onChange('dietDetail', v)}
            placeholder="Vegetarianx, celíacx, alergias..."
            full
          />
        )}
      </div>
    </div>
  );
}

interface FieldInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  full?: boolean;
}

function FieldInput({ label, value, onChange, placeholder, type = 'text', required, full }: FieldInputProps) {
  return (
    <div className={`field ${full ? 'field--full' : ''}`}>
      <label className="field-label">
        {label}{required && <span className="req">*</span>}
      </label>
      <input
        className="field-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

function RSVPSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { threshold: 0.15 });
  const [main, setMain] = useState<Guest>(blankGuest());
  const [plusOnes, setPlusOnes] = useState<Guest[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const updateMain = (field: keyof Guest, value: string) =>
    setMain((prev) => ({ ...prev, [field]: value }));

  const updatePlusOne = (idx: number, field: keyof Guest, value: string) =>
    setPlusOnes((arr) => arr.map((g, i) => i === idx ? { ...g, [field]: value } : g));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    console.log({ main, plusOnes });
  };

  return (
    <section className="rsvp" ref={ref}>
      <div className="rsvp-head">
        <div className="rsvp-eyebrow">/02 — CONFIRMACIÓN</div>
        <h2 className={`rsvp-title ${inView ? 'is-in' : ''}`}>
          <span className="glitchy-mild">CONFIRMÁ</span>
          <span>TU LUGAR</span>
        </h2>
        <p className="rsvp-sub">
          Necesitamos saber quién viene. Completá tus datos y sumá acompañantes si tenés.
        </p>
        <div className="rsvp-deadline">
          <span className="rsvp-deadline-label">CONFIRMAR HASTA</span>
          <span className="rsvp-deadline-date">17 · JUNIO · 2026</span>
        </div>
      </div>

      {submitted ? (
        <div className="rsvp-success">
          <div className="rsvp-success-num">
            <OdometerNumber value={plusOnes.length + 1} trigger duration={900} />
          </div>
          <div className="rsvp-success-text">
            <div className="rsvp-success-eyebrow">
              GRACIAS, {main.name.toUpperCase() || 'INVITADX'}
            </div>
            <h3>NOS VEMOS EL 27.</h3>
            <p>
              Te confirmamos {plusOnes.length + 1}{' '}
              {plusOnes.length === 0 ? 'lugar' : 'lugares'} a tu nombre.
            </p>
            <button className="rsvp-edit" onClick={() => setSubmitted(false)}>
              EDITAR RESPUESTA
            </button>
          </div>
        </div>
      ) : (
        <form className="rsvp-form" onSubmit={handleSubmit}>
          <GuestCard
            index={0}
            label="INVITADX PRINCIPAL"
            guest={main}
            onChange={updateMain}
          />
          {plusOnes.map((g, i) => (
            <GuestCard
              key={i}
              index={i + 1}
              label={`ACOMPAÑANTE +${i + 1}`}
              guest={g}
              onChange={(f, v) => updatePlusOne(i, f, v)}
              onRemove={() => setPlusOnes((arr) => arr.filter((_, j) => j !== i))}
            />
          ))}
          <div className="rsvp-actions">
            <button
              type="button"
              className="rsvp-add"
              onClick={() => setPlusOnes((arr) => [...arr, blankGuest()])}
            >
              <span className="rsvp-add-plus">＋</span>
              <span>AGREGAR ACOMPAÑANTE  <em>+{plusOnes.length + 1}</em></span>
            </button>
            <button type="submit" className="rsvp-submit">
              <span>CONFIRMAR ASISTENCIA</span>
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/* =========================================================
 *  MESSAGE
 * ======================================================= */

// function MessageSection() {
//   const ref = useRef<HTMLElement>(null);
//   const inView = useInView(ref, { threshold: 0.2 });
//   const [msg, setMsg] = useState('');
//   const [sender, setSender] = useState('');
//   const [sent, setSent] = useState(false);

//   return (
//     <section className="message" ref={ref}>
//       <div className="msg-eyebrow">/03 — MENSAJE</div>
//       <h2 className={`msg-title ${inView ? 'is-in' : ''}`}>
//         <span>DEJALE UN</span>
//         <span className="msg-title-accent">MENSAJE</span>
//         <span>A JULI</span>
//       </h2>

//       {sent ? (
//         <div className="msg-sent">
//           <div className="msg-sent-mark">♥</div>
//           <p>MENSAJE ENVIADO</p>
//           <button
//             type="button"
//             className="msg-again"
//             onClick={() => { setSent(false); setMsg(''); setSender(''); }}
//           >
//             ESCRIBIR OTRO
//           </button>
//         </div>
//       ) : (
//         <form
//           className="msg-form"
//           onSubmit={(e) => { e.preventDefault(); setSent(true); console.log({ sender, msg }); }}
//         >
//           <textarea
//             className="msg-textarea"
//             placeholder="Escribí algo lindo para ella..."
//             value={msg}
//             onChange={(e) => setMsg(e.target.value)}
//             rows={5}
//             required
//           />
//           <div className="msg-bottom">
//             <input
//               className="msg-from"
//               type="text"
//               placeholder="DE PARTE DE..."
//               value={sender}
//               onChange={(e) => setSender(e.target.value)}
//               required
//             />
//             <button type="submit" className="msg-send">
//               ENVIAR
//               <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
//                 <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="2"/>
//               </svg>
//             </button>
//           </div>
//         </form>
//       )}
//     </section>
//   );
// }

/* =========================================================
 *  FOOTER
 * ======================================================= */

function Footer() {
  return (
    <footer className="footer">
      <Marquee items={['JULI · 15', '27 · 06 · 2026', 'SUMMUM', '20 HS', 'JULI · 15', '27 · 06 · 2026']} />
      <div className="footer-grid">
        <div>
          <div className="footer-eyebrow">EVENTO</div>
          <div className="footer-big glitchy-mild">JULI<br />FIFTEEN</div>
        </div>
        <div>
          <div className="footer-eyebrow">FECHA</div>
          <div className="footer-text">27 · JUNIO · 2026<br />20:00 HS</div>
        </div>
        <div>
          <div className="footer-eyebrow">LUGAR</div>
          <div className="footer-text">SUMMUM<br />Avellaneda 163<br />Las Varillas, Córdoba</div>
        </div>
        <div>
          <div className="footer-eyebrow">RSVP</div>
          <div className="footer-text">CONFIRMÁ TU LUGAR<br />HASTA EL 17 DE JUNIO</div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© JULI RICCI · 2026</span>
        <span>WITH LOVE</span>
      </div>
    </footer>
  );
}

/* =========================================================
 *  PAGE ROOT
 * ======================================================= */

export default function JuliPage({ event_id }: { event_id: string }) {
  return (
    <div className="juli-root app has-grain">
      <Hero />
      <DateSection />
      <GalleryBand />
      <LocationSection />
      <RSVPForm event_id={event_id} />
      <MessageSection event_id={event_id} />
      <Footer />
    </div>
  );
}
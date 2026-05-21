'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './styles.css';

/* =========================================================================
 *  HELPERS & HOOKS
 * =======================================================================*/

function useInView(ref: React.RefObject<HTMLElement>, opts = { threshold: 0.25 }) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setInView(true);
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return inView;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

interface OdometerNumberProps {
  value: number;
  duration?: number;
  trigger?: boolean;
  pad?: number;
}

function OdometerNumber({ value, duration = 1400, trigger = true, pad = 0 }: OdometerNumberProps) {
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
  trigger?: boolean;
}

function DigitRoll({ digit, delay = 0, trigger = true }: DigitRollProps) {
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
  value: number;
  trigger?: boolean;
  baseDelay?: number;
}

function RollingNumber({ value, trigger = true, baseDelay = 0 }: RollingNumberProps) {
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

/* =========================================================================
 *  DIAMOND COMPONENT
 * =======================================================================*/

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
  const cells = useMemo(() => {
    const out: any[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = (r * 31 + c * 17) % colors.length;
        const h = ((r * 73856093) ^ (c * 19349663)) >>> 0;
        const rand1 = (h % 1000) / 1000;
        const rand2 = ((h >> 10) % 1000) / 1000;
        const rand3 = ((h >> 20) % 1000) / 1000;
        const rand4 = ((h >> 5) % 1000) / 1000;
        out.push({
          r,
          c,
          color: colors[seed],
          baseX: (rand1 - 0.5) * 80,
          baseY: (rand4 - 0.5) * 80,
          baseRot: (rand3 - 0.5) * 30,
          dx: (rand1 - 0.5) * 22,
          dy: (rand2 - 0.5) * 22,
          rot: (rand3 - 0.5) * 26,
          scale: 0.7 + rand4 * 0.7,
          duration: 4 + rand1 * 6,
          delay: rand2 * -10,
        });
      }
    }
    return out;
  }, [cols, rows]);

  return (
    <div className="diamond-lattice" style={{ '--cols': cols, '--rows': rows } as React.CSSProperties}>
      <div className="diamond-lattice-track">
        {[0, 1].map(rep => (
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
                  '--bscale': cell.scale,
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

/* =========================================================================
 *  IMAGE SLOT HOOK
 * =======================================================================*/

interface ImageSlotData {
  u?: string;
  s?: number;
  x?: number;
  y?: number;
}

function useImageSlot(id: string, initialSrc?: string) {
  const [state, setState] = useState<ImageSlotData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(true);
  }, [id]);

  const url = state?.u || initialSrc || '';

  const setImage = useCallback((dataUrl: string) => {
    setState({ u: dataUrl, s: 1, x: 0, y: 0 });
  }, []);

  const clearImage = useCallback(() => {
    setState(null);
  }, []);

  return { url, setImage, clearImage };
}

interface ImageSlotProps {
  id: string;
  src?: string;
  placeholder?: string;
  shape?: 'rect' | 'rounded' | 'circle' | 'pill';
}

function ImageSlot({ id, src, placeholder = 'Drop an image', shape = 'rounded' }: ImageSlotProps) {
  const { url, setImage, clearImage } = useImageSlot(id, src);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const borderRadiusMap = {
    rect: '0px',
    rounded: '12px',
    circle: '50%',
    pill: '9999px',
  };

  return (
    <div
      className={`image-slot ${dragging ? 'image-drag-over' : ''} ${url ? 'image-filled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ borderRadius: borderRadiusMap[shape] } as React.CSSProperties}
    >
      {url ? (
        <div className="image-slot-content">
          <img src={url} alt="" className="image-slot-img" />
          <div className="image-slot-controls">
            <button
              onClick={() => inputRef.current?.click()}
              className="image-slot-btn"
              type="button"
            >
              Replace
            </button>
            <button
              onClick={clearImage}
              className="image-slot-btn"
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className="image-slot-empty"
          onClick={() => inputRef.current?.click()}
        >
          <div className="image-slot-icon">📷</div>
          <div className="image-slot-placeholder">{placeholder}</div>
          <div className="image-slot-hint">or browse files</div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        hidden
      />
    </div>
  );
}

/* =========================================================================
 *  MARQUEE
 * =======================================================================*/

interface MarqueeProps {
  items?: string[];
  reverse?: boolean;
}

function Marquee({ items = ['JULI 15', '27 · 06 · 2026', 'SUMMUM', 'LAS VARILLAS', '20 HS'], reverse = false }: MarqueeProps) {
  return (
    <div className={`marquee ${reverse ? 'marquee-rev' : ''}`}>
      <div className="marquee-track">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-text">{t}</span>
            <span className="marquee-dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 *  HERO
 * =======================================================================*/

function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const slices = useMemo(() => {
    return Array.from({ length: 32 }).map((_, i) => {
      const h = (((i + 1) * 73856093) ^ (i * 19349663)) >>> 0;
      const r1 = (h % 1000) / 1000;
      const r2 = ((h >> 7) % 1000) / 1000;
      const r3 = ((h >> 14) % 1000) / 1000;
      const top = i * (100 / 32);
      const height = 100 / 32;
      return {
        top,
        height,
        shiftX: (r1 - 0.5) * 220,
        hue: (r3 - 0.5) * 220,
        phase: r2 * 0.4,
      };
    });
  }, []);

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
        <div className="hero-side">
          <span className="hero-side-text">JULIA · RICCI · MIS QUINCE · SÁBADO 27.06.2026 · SUMMUM · LAS VARILLAS</span>
        </div>

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
            <div className="logo-main">
              <h1 className="logo-word logo-word-juli">
                JULI
                <span className="logo-fifteen-overlay">FIFTEEN</span>
              </h1>
            </div>
          </div>

          <div className="hero-bottom-row">
            <div className="hero-bottom-block">
              <span className="hb-key">SAVE THE DATE</span>
              <span className="hb-val">27 · 06 · 2026</span>
            </div>
            <div className="hero-bottom-block hero-bottom-block-center">
              <Diamond color="var(--accent)" strokeWidth={1.6} />
            </div>
            <div className="hero-bottom-block hero-bottom-block-right">
              <span className="hb-key">SUMMUM</span>
              <span className="hb-val">20 HS</span>
            </div>
          </div>

          <div
            className="hero-banner-wrap"
            style={{ transform: `translate3d(calc(-50% + ${mouse.x * -10}px), ${mouse.y * -6}px, 0)` }}
          >
            <img className="hero-banner" src="/assets/juli-banner.webp" alt="Juli" />
            {slices.map((s, i) => (
              <img
                key={i}
                className="hero-banner-slice"
                src="/assets/juli-banner.webp"
                alt=""
                aria-hidden="true"
                style={{
                  clipPath: `polygon(0 ${s.top}%, 100% ${s.top}%, 100% ${s.top + s.height}%, 0 ${s.top + s.height}%)`,
                  '--shift-x': `${s.shiftX}px`,
                  '--slice-hue': `${s.hue}deg`,
                  animationDelay: `${s.phase}s`,
                } as React.CSSProperties}
              />
            ))}
            <div className="hero-banner-scanlines" aria-hidden="true"></div>
            <div className="hero-banner-noise" aria-hidden="true"></div>
          </div>
        </div>

        <div className="hero-side hero-side-right">
          <span className="hero-side-text">LAS VARILLAS · CÓRDOBA · AVELLANEDA 163 · 20HS · 27.06.2026</span>
        </div>
      </div>

      <div className="scroll-cue">
        <span>SCROLL</span>
        <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
          <path d="M7 1V20M7 20L1 14M7 20L13 14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </section>
  );
}

/* =========================================================================
 *  DATE SECTION
 * =======================================================================*/

interface CountdownCellProps {
  value: number;
  label: string;
  trigger?: boolean;
  delay?: number;
}

function CountdownCell({ value, label, trigger = true, delay = 0 }: CountdownCellProps) {
  const [display, setDisplay] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const initialValue = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger || revealed) return;
    if (initialValue.current === null) initialValue.current = value;
    const target = initialValue.current;
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
  }, [trigger]);

  useEffect(() => {
    if (revealed) setDisplay(value);
  }, [value, revealed]);

  return (
    <div className="cd-cell">
      <div className="cd-value">{String(display).padStart(2, '0')}</div>
      <div className="cd-label">{label}</div>
    </div>
  );
}

function DateSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.35 });

  const target = useMemo(() => new Date('2026-06-27T20:00:00-03:00').getTime(), []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const mins = Math.floor((diff / 60000) % 60);
  const secs = Math.floor((diff / 1000) % 60);

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
            <RollingNumber value={27} trigger={inView} baseDelay={0} />
          </span>
        </div>
        <div className="date-row date-row-mid">
          <span className="date-mega date-mega-accent">
            <span className="date-month">JUNIO</span>
          </span>
        </div>
        <div className="date-row date-row-end">
          <span className="date-mega">
            <RollingNumber value={2026} trigger={inView} baseDelay={400} />
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
          <CountdownCell value={days} label="DÍAS" trigger={inView} delay={800} />
          <CountdownCell value={hours} label="HORAS" trigger={inView} delay={950} />
          <CountdownCell value={mins} label="MIN" trigger={inView} delay={1100} />
          <CountdownCell value={secs} label="SEG" trigger={inView} delay={1250} />
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
 *  GALLERY BAND
 * =======================================================================*/

function GalleryBand() {
  return (
    <section className="gallery">
      <Marquee items={['JULI · FIFTEEN', '27 · JUNIO · 2026', 'SUMMUM', 'JULI · FIFTEEN', '27 · JUNIO · 2026']} />
      <div className="gallery-grid">
        <div className="gallery-cell gallery-cell-tall">
          <ImageSlot id="gal-1" src="/assets/juli-01.jpg" placeholder="FOTO 01" shape="rect" />
          <span className="gallery-tag">01 / FULL BODY</span>
        </div>
        <div className="gallery-cell gallery-cell-wide">
          <ImageSlot id="gal-2" src="/assets/juli-02.jpg" placeholder="FOTO 02" shape="rect" />
          <span className="gallery-tag">02 / MOVEMENT</span>
        </div>
        <div className="gallery-cell">
          <ImageSlot id="gal-3" src="/assets/juli-03.jpg" placeholder="FOTO 03" shape="rect" />
          <span className="gallery-tag">03 / CLOSE UP</span>
        </div>
        <div className="gallery-cell gallery-cell-square">
          <ImageSlot id="gal-4" src="/assets/juli-04.jpg" placeholder="FOTO 04" shape="rect" />
          <span className="gallery-tag">04 / GAZE</span>
        </div>
      </div>
      <Marquee reverse items={['LAS VARILLAS', 'CÓRDOBA', 'SUMMUM', '20 HS', 'LAS VARILLAS', 'CÓRDOBA', 'SUMMUM']} />
    </section>
  );
}

/* =========================================================================
 *  LOCATION SECTION
 * =======================================================================*/

function LocationSection() {
  const ref = useRef<HTMLDivElement>(null);
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
            <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="1.6" />
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
          ></iframe>
          <div className="loc-map-overlay"></div>
          <div className="loc-pin">
            <div className="loc-pin-dot"></div>
            <div className="loc-pin-pulse"></div>
            <div className="loc-pin-label">SUMMUM</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
 *  RSVP FORM
 * =======================================================================*/

interface Guest {
  name: string;
  phone: string;
  dietRestriction: 'no' | 'si';
  dietDetail: string;
}

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
        <div className="field">
          <label className="field-label">
            NOMBRE Y APELLIDO<span className="req">*</span>
          </label>
          <input
            className="field-input"
            type="text"
            value={guest.name}
            placeholder="Nombre completo"
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label">
            TELÉFONO<span className="req">*</span>
          </label>
          <input
            className="field-input"
            type="tel"
            value={guest.phone}
            placeholder="+54 9 ..."
            onChange={(e) => onChange('phone', e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label">¿RESTRICCIÓN ALIMENTARIA?</label>
          <div className="seg">
            {(['no', 'si'] as const).map(opt => (
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
          <div className="field field-full">
            <label className="field-label">¿CUÁL?</label>
            <input
              className="field-input"
              type="text"
              value={guest.dietDetail}
              placeholder="Vegetarianx, celíacx, alergias..."
              onChange={(e) => onChange('dietDetail', e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RSVPSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.15 });
  const [main, setMain] = useState<Guest>(blankGuest());
  const [plusOnes, setPlusOnes] = useState<Guest[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const updateGuest = (setter: React.Dispatch<React.SetStateAction<Guest>>) => (field: keyof Guest, value: string) =>
    setter(prev => ({ ...prev, [field]: value }));

  const updatePlusOne = (idx: number, field: keyof Guest, value: string) =>
    setPlusOnes(arr => arr.map((g, i) => i === idx ? { ...g, [field]: value } : g));

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
          <span>CONFIRMÁ</span>
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
            <div className="rsvp-success-eyebrow">GRACIAS, {main.name.toUpperCase() || 'INVITADX'}</div>
            <h3>NOS VEMOS EL 27.</h3>
            <p>Te confirmamos {plusOnes.length + 1} {plusOnes.length === 0 ? 'lugar' : 'lugares'} a tu nombre.</p>
            <button className="rsvp-edit" onClick={() => setSubmitted(false)}>EDITAR RESPUESTA</button>
          </div>
        </div>
      ) : (
        <form className="rsvp-form" onSubmit={handleSubmit}>
          <GuestCard
            index={0}
            label="INVITADX PRINCIPAL"
            guest={main}
            onChange={updateGuest(setMain)}
          />

          {plusOnes.map((g, i) => (
            <GuestCard
              key={i}
              index={i + 1}
              label={`ACOMPAÑANTE +${i + 1}`}
              guest={g}
              onChange={(f, v) => updatePlusOne(i, f, v)}
              onRemove={() => setPlusOnes(arr => arr.filter((_, j) => j !== i))}
            />
          ))}

          <div className="rsvp-actions">
            <button
              type="button"
              className="rsvp-add"
              onClick={() => setPlusOnes(arr => [...arr, blankGuest()])}
            >
              <span className="rsvp-add-plus">＋</span>
              <span>AGREGAR ACOMPAÑANTE  <em>+{plusOnes.length + 1}</em></span>
            </button>

            <button type="submit" className="rsvp-submit">
              <span>CONFIRMAR ASISTENCIA</span>
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/* =========================================================================
 *  MESSAGE SECTION
 * =======================================================================*/

function MessageSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.2 });
  const [msg, setMsg] = useState('');
  const [sender, setSender] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <section className="message" ref={ref}>
      <div className="msg-eyebrow">/03 — MENSAJE</div>
      <h2 className={`msg-title ${inView ? 'is-in' : ''}`}>
        <span>DEJALE UN</span>
        <span className="msg-title-accent">MENSAJE</span>
        <span>A JULI</span>
      </h2>

      {sent ? (
        <div className="msg-sent">
          <div className="msg-sent-mark">♥</div>
          <p>MENSAJE ENVIADO</p>
          <button type="button" className="msg-again" onClick={() => { setSent(false); setMsg(''); setSender(''); }}>
            ESCRIBIR OTRO
          </button>
        </div>
      ) : (
        <form
          className="msg-form"
          onSubmit={(e) => { e.preventDefault(); setSent(true); console.log({ sender, msg }); }}
        >
          <textarea
            className="msg-textarea"
            placeholder="Escribí algo lindo para ella..."
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={5}
            required
          />
          <div className="msg-bottom">
            <input
              className="msg-from"
              type="text"
              placeholder="DE PARTE DE..."
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              required
            />
            <button type="submit" className="msg-send">
              ENVIAR
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/* =========================================================================
 *  FOOTER
 * =======================================================================*/

function Footer() {
  return (
    <footer className="footer">
      <Marquee items={['JULI · 15', '27 · 06 · 2026', 'SUMMUM', '20 HS', 'JULI · 15', '27 · 06 · 2026']} />
      <div className="footer-grid">
        <div>
          <div className="footer-eyebrow">EVENTO</div>
          <div className="footer-big">JULI<br/>FIFTEEN</div>
        </div>
        <div>
          <div className="footer-eyebrow">FECHA</div>
          <div className="footer-text">27 · JUNIO · 2026<br/>20:00 HS</div>
        </div>
        <div>
          <div className="footer-eyebrow">LUGAR</div>
          <div className="footer-text">SUMMUM<br/>Avellaneda 163<br/>Las Varillas, Córdoba</div>
        </div>
        <div>
          <div className="footer-eyebrow">RSVP</div>
          <div className="footer-text">CONFIRMÁ TU LUGAR<br/>HASTA EL 17 DE JUNIO</div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© JULI RICCI · 2026</span>
        <span>WITH LOVE</span>
      </div>
    </footer>
  );
}

/* =========================================================================
 *  MAIN APP
 * =======================================================================*/

export default function JuliPage() {
  useEffect(() => {
    document.documentElement.style.setProperty('--bg', '#150216');
    document.documentElement.style.setProperty('--red', '#e91c01');
    document.documentElement.style.setProperty('--magenta', '#bf60be');
    document.documentElement.style.setProperty('--celeste', '#7bd3fe');
    document.documentElement.style.setProperty('--blue', '#0055ba');
    document.documentElement.style.setProperty('--paper', '#f5fcff');
    document.documentElement.style.setProperty('--accent', '#bf60be');
    document.documentElement.style.setProperty('--marquee-speed', '32s');
  }, []);

  return (
    <div className="juli-root app">
      <Hero />
      <DateSection />
      <GalleryBand />
      <LocationSection />
      <RSVPSection />
      <MessageSection />
      <Footer />
    </div>
  );
}
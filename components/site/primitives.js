'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/cms';

export function Reveal({ children, delay = 0, y = 28, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, delay = 0 }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, y = 26 }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StatCounter({ value = 0, suffix = '', prefix = '', decimals = 0, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const target = Number(value) || 0;
    const dur = 1200;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className={className}>
      {prefix}{n.toFixed(decimals)}{suffix}
    </span>
  );
}

export function Countdown({ target, className }) {
  const [t, setT] = useState(null);
  useEffect(() => {
    const calc = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0, done: true });
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
        done: false,
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!t) return null;
  const units = [ { k: 'd', label: 'Days' }, { k: 'h', label: 'Hrs' }, { k: 'm', label: 'Min' }, { k: 's', label: 'Sec' } ];
  return (
    <div className={cn('flex gap-3 sm:gap-4', className)}>
      {units.map((u) => (
        <div key={u.k} className="glass rounded-xl px-4 py-3 min-w-[70px] sm:min-w-[84px] text-center glow-soft">
          <motion.div key={t[u.k]} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }} className="font-num text-4xl sm:text-5xl leading-none text-primary text-glow">
            {String(t[u.k]).padStart(2, '0')}
          </motion.div>
          <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">{u.label}</div>
        </div>
      ))}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, center, className }) {
  return (
    <div className={cn(center && 'text-center mx-auto', 'max-w-2xl', className)}>
      {eyebrow && (
        <div className={cn('mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary', center && 'justify-center')}>
          <span className="h-px w-6 bg-primary/60" />{eyebrow}
        </div>
      )}
      <h2 className="font-display text-4xl sm:text-5xl font-700 font-semibold uppercase tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground text-base sm:text-lg">{subtitle}</p>}
    </div>
  );
}

export function TeamBadge({ team, size = 44, className }) {
  const s = size;
  if (team?.logo_url) {
    return <img src={team.logo_url} alt={team?.name} style={{ width: s, height: s }} className={cn('rounded-full object-cover ring-1 ring-white/10', className)} />;
  }
  return (
    <div
      style={{ width: s, height: s, background: `linear-gradient(135deg, ${team?.color || '#39FF14'}, rgba(0,0,0,0.6))` }}
      className={cn('rounded-full grid place-items-center font-display font-bold text-black ring-1 ring-white/10 shrink-0', className)}
    >
      <span style={{ fontSize: s * 0.36 }}>{initials(team?.short_name || team?.name || '?')}</span>
    </div>
  );
}

export function LiveDot({ label = 'LIVE' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {label}
    </span>
  );
}

export function WinProbBar({ a, b, probA = 50 }) {
  const p = Math.max(0, Math.min(100, Number(probA)));
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1.5">
        <span className="text-primary">{a} {p}%</span>
        <span className="text-muted-foreground">{100 - p}% {b}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div initial={{ width: 0 }} whileInView={{ width: p + '%' }} viewport={{ once: true }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 glow-green" />
      </div>
    </div>
  );
}

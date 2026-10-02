'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, Instagram, Twitter, Youtube, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAV_LINKS } from '@/lib/cms';

export function SiteNav({ settings }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const name = settings?.tournament_name || 'Nepal Premier League';
  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled ? 'glass-strong border-b border-white/5 py-3' : 'py-5')}>
      <nav className="container flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground glow-green">
            {settings?.logo_url ? <img src={settings.logo_url} alt="" className="h-full w-full rounded-lg object-contain" /> : <Zap className="h-5 w-5" fill="currentColor" />}
          </span>
          <span className="font-display text-lg font-bold uppercase tracking-wide leading-none">
            {name.split(' ')[0]}<span className="text-primary">{name.split(' ').slice(1).join(' ') ? ' ' + name.split(' ').slice(1).join(' ') : ''}</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="relative px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Link href="/admin"><Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button></Link>
          <Link href="/#register"><Button size="sm" className="font-semibold glow-green">Register Now</Button></Link>
        </div>

        <button className="lg:hidden p-2" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-lg" onClick={() => setOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26 }} className="absolute right-0 top-0 h-full w-72 glass-strong p-6">
              <div className="flex justify-between items-center mb-8">
                <span className="font-display font-bold uppercase">{name}</span>
                <button onClick={() => setOpen(false)}><X /></button>
              </div>
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-3 border-b border-white/5 font-display uppercase tracking-wide text-lg">{l.label}</Link>
                ))}
                <Link href="/admin" onClick={() => setOpen(false)} className="py-3 border-b border-white/5 font-display uppercase tracking-wide text-lg text-muted-foreground">Admin</Link>
              </div>
              <Link href="/#register" onClick={() => setOpen(false)}><Button className="w-full mt-6 font-semibold">Register Now</Button></Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function SiteFooter({ settings }) {
  const name = settings?.tournament_name || 'Nepal Premier League';
  const socials = [Instagram, Twitter, Youtube, Facebook];
  return (
    <footer className="relative border-t border-white/5 mt-24 stadium-grid">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">{settings?.logo_url ? <img src={settings.logo_url} alt="" className="h-full w-full rounded-lg object-contain" /> : <Zap className="h-5 w-5" fill="currentColor" />}</span>
              <span className="font-display text-lg font-bold uppercase">{name}</span>
            </div>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{settings?.tagline || 'Where Legends Are Forged. Experience the most cinematic cricket tournament, live.'}</p>
            <div className="flex gap-3 mt-5">
              {socials.map((Icon, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-lg glass hover:bg-primary hover:text-primary-foreground transition-colors"><Icon className="h-4 w-4" /></a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display uppercase tracking-wide text-sm mb-4 text-muted-foreground">Explore</h4>
            <div className="flex flex-col gap-2.5 text-sm">
              {NAV_LINKS.map((l) => <Link key={l.label} href={l.href} className="text-foreground/80 hover:text-primary transition-colors">{l.label}</Link>)}
            </div>
          </div>
          <div>
            <h4 className="font-display uppercase tracking-wide text-sm mb-4 text-muted-foreground">More</h4>
            <div className="flex flex-col gap-2.5 text-sm">
              <Link href="/#register" className="text-foreground/80 hover:text-primary transition-colors">Register</Link>
              <Link href="/#sponsors" className="text-foreground/80 hover:text-primary transition-colors">Sponsors</Link>
              <Link href="/#gallery" className="text-foreground/80 hover:text-primary transition-colors">Gallery</Link>
              <Link href="/admin" className="text-foreground/80 hover:text-primary transition-colors">Admin Login</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
          <span>Crafted for the love of the game — Season {settings?.season || '2025'}</span>
        </div>
      </div>
    </footer>
  );
}

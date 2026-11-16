import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/signalements', label: 'Carte & liste' },
  { to: '/suivre', label: 'Suivre un code' },
  { to: '/transparence', label: 'Transparence' },
  { to: '/admin', label: 'Admin' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <a
        href="#contenu"
        className="sr-only rounded-full bg-ochre px-5 py-3 font-semibold text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
      >
        Aller au contenu
      </a>
      <div
        className={`glass relative mx-auto max-w-6xl overflow-hidden rounded-2xl transition-shadow duration-300 ${
          scrolled ? 'shadow-soft' : ''
        }`}
      >
        <nav aria-label="Navigation principale" className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
          <Link to="/" className="flex min-h-11 items-center rounded-xl pr-2" aria-label="NIO FAR — accueil">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] font-medium text-fg-muted transition-colors hover:bg-fg/5 hover:text-fg"
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              to="/signaler"
              className="hidden min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              Signaler
            </Link>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-fg/10 lg:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              id="menu-mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-line px-3 lg:hidden"
            >
              {[...links, { to: '/signaler', label: 'Signaler un problème' }].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="flex min-h-12 items-center rounded-xl px-3 text-lg font-medium hover:bg-fg/5">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="h-2" aria-hidden />
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-mint via-accent to-ochre"
          style={{ scaleX: progress }}
        />
      </div>
    </header>
  );
}

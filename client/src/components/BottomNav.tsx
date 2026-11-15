import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, Megaphone, Search } from 'lucide-react';
import { useHorsLigne } from '../lib/offline';

const items = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/suivre', label: 'Suivre', icon: Search, end: false },
  { to: '/signaler', label: 'Signaler', icon: Megaphone, end: false, central: true },
  { to: '/signalements', label: 'Carte', icon: Map, end: false },
];

/** Barre de navigation basse (mobile d'abord, masquée sur grand écran). */
export function BottomNav() {
  const { enAttente } = useHorsLigne();
  return (
    <nav
      aria-label="Navigation rapide"
      className="glass fixed inset-x-2 bottom-2 z-50 rounded-3xl shadow-soft lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end, central }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-3xl text-xs font-semibold transition-colors ${
                  isActive ? 'text-accent' : 'text-fg-muted hover:text-fg'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-actif"
                      className="absolute inset-1 -z-10 rounded-2xl bg-accent/12"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span
                    className={
                      central
                        ? 'grid h-9 w-9 place-items-center rounded-full bg-ochre text-ink shadow-cta'
                        : 'grid h-9 w-9 place-items-center'
                    }
                  >
                    <Icon size={central ? 20 : 22} aria-hidden />
                  </span>
                  {label}
                  {to === '/suivre' && enAttente.length > 0 && (
                    <span className="absolute right-[22%] top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ochre px-1 text-[0.7rem] font-bold text-ink">
                      {enAttente.length}
                      <span className="sr-only"> en attente d’envoi</span>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

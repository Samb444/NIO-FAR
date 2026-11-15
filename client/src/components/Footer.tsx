import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="relative mt-10 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-fg-muted">
            Plateforme citoyenne de suivi des problèmes de proximité en banlieue de Dakar.
            <span className="mt-1 block italic">« Nio far » : nous sommes ensemble, en wolof.</span>
          </p>
        </div>
        <nav aria-label="Liens du pied de page">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-fg-muted">Plateforme</h2>
          <ul className="space-y-1">
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/signaler">Signaler un problème</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/signalements">Voir les signalements</Link></li>
          </ul>
        </nav>
        <nav aria-label="Sections de la page d'accueil">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-fg-muted">En savoir plus</h2>
          <ul className="space-y-1">
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/#comment-ca-marche">Comment ça marche</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/#categories">Les 4 catégories</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/#engagement">Notre engagement</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-6 text-sm text-fg-muted">
          Prototype présenté au concours Banlieue Smart Genius 2026.
        </p>
      </div>
    </footer>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Smartphone } from 'lucide-react';
import { Logo } from './Logo';
import { btn } from './ui';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function Footer() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installe, setInstalle] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalle(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installerPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res.outcome === 'accepted') {
      setInstalle(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <footer className="relative mt-10 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-fg-muted">
            Plateforme citoyenne de suivi des problèmes de proximité en banlieue de Dakar.
            <span className="mt-1 block italic">« Nio far » : nous sommes ensemble, en wolof.</span>
          </p>

          <div className="mt-4">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => void installerPwa()}
                className={`${btn.base} ${btn.secondary} min-h-10 px-4 text-xs`}
              >
                <Download size={15} aria-hidden /> Installer l’application sur l’écran d’accueil (PWA)
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-elev px-3 py-1 text-xs text-fg-muted">
                <Smartphone size={14} className="text-accent" aria-hidden />
                {installe
                  ? 'Application installée sur votre appareil (PWA)'
                  : 'Application web installable (PWA + file d’attente hors-ligne)'}
              </span>
            )}
          </div>
        </div>
        <nav aria-label="Liens du pied de page">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-fg-muted">Plateforme</h2>
          <ul className="space-y-1">
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/signaler">Signaler un problème</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/suivre">Suivre avec un code</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/signalements">Carte et liste</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/points">Points citoyens &amp; Quartiers</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/transparence">Transparence &amp; Open Data</Link></li>
            <li><Link className="inline-flex min-h-11 items-center hover:text-accent" to="/admin">Espace Administration</Link></li>
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
          Prototype présenté au concours Banlieue Smart Genius 2026 — Tout contenu de démonstration est étiqueté « Exemple fictif ».
        </p>
      </div>
    </footer>
  );
}

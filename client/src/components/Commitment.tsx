import { BadgeCheck, Eye, HandHeart, ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';

const commitments = [
  {
    icon: Eye,
    title: 'Transparence',
    text: 'Chaque signalement affiche son statut et son historique. Les changements de statut sont datés et visibles par tous.',
  },
  {
    icon: ShieldCheck,
    title: 'Données minimales',
    text: 'Nous ne collectons que le nécessaire : une photo, une catégorie, une position. Pas de profilage, pas de revente.',
  },
  {
    icon: HandHeart,
    title: 'Aucune promesse de résolution',
    text: 'NIO FAR rend les problèmes visibles et suivis. La plateforme ne répare rien elle-même et ne garantit aucun délai.',
  },
  {
    icon: BadgeCheck,
    title: 'Vérification avant « Résolu »',
    text: 'Un problème n’est déclaré résolu qu’après confirmation sur le terrain par des habitants, photo à l’appui.',
  },
];

export function Commitment() {
  return (
    <section id="engagement" aria-labelledby="eng-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-5xl bg-forest px-6 py-16 text-sand shadow-glow sm:px-12 lg:px-16">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-mint/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-ochre/25 blur-3xl" />

          <Reveal className="relative max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-mint">
              <span className="h-px w-8 bg-current" aria-hidden />
              Notre engagement
            </p>
            <h2 id="eng-title" className="text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-6xl">
              La confiance se construit <span className="text-ochre">sur le terrain.</span>
            </h2>
            <p className="mt-5 text-lg text-sand/85 sm:text-xl">
              Quatre principes simples, non négociables, qui guident chaque choix de conception.
            </p>
          </Reveal>

          <ul className="relative mt-12 grid gap-4 sm:grid-cols-2">
            {commitments.map((c, i) => (
              <li key={c.title}>
                <Reveal delay={i * 0.08} className="h-full">
                  <div className="flex h-full gap-4 rounded-3xl border border-sand/15 bg-sand/[0.07] p-6 backdrop-blur-md transition-colors hover:bg-sand/[0.12]">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ochre text-ink">
                      <c.icon size={24} aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{c.title}</h3>
                      <p className="mt-1.5 text-sand/85">{c.text}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <ShieldCheck aria-hidden className="pointer-events-none absolute -bottom-10 right-6 hidden h-64 w-64 text-sand/[0.05] lg:block" />
        </div>
      </div>
    </section>
  );
}

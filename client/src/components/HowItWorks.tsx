import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { BadgeCheck, Camera, Send, Users } from 'lucide-react';
import { Reveal, SectionHeading } from './Reveal';

const steps = [
  {
    icon: Camera,
    title: 'Signaler',
    text: 'Une photo, une catégorie, une position. Le signalement est créé en quelques gestes, depuis un téléphone.',
    status: 'Signalé',
  },
  {
    icon: Users,
    title: 'Vérifier',
    text: 'D’autres habitants confirment le problème. Les doublons sont regroupés pour éviter le bruit.',
    status: 'Confirmé',
  },
  {
    icon: Send,
    title: 'Transmettre',
    text: 'Le signalement confirmé peut être transmis aux services compétents, avec un historique clair et public.',
    status: 'Transmis',
  },
  {
    icon: BadgeCheck,
    title: 'Résoudre',
    text: 'Un problème ne passe « Résolu » qu’après vérification sur place par les habitants. Pas avant.',
    status: 'Résolu (vérifié)',
  },
];

export function HowItWorks() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 80%', 'end 55%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });

  return (
    <section id="comment-ca-marche" aria-labelledby="ccm-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          id="ccm-title"
          eyebrow="Comment ça marche"
          title={
            <>
              Quatre étapes, <span className="text-accent">zéro opacité.</span>
            </>
          }
          intro="Chaque signalement suit un parcours visible par tous. Rien n’est marqué comme réglé sans preuve du terrain."
        />

        <ol ref={listRef} className="relative mt-16 grid gap-6 lg:grid-cols-4 lg:gap-5">
          {/* Fil de progression */}
          <div aria-hidden className="absolute bottom-6 left-7 top-6 w-1 rounded-full bg-line lg:hidden">
            <motion.div className="h-full w-full origin-top rounded-full bg-gradient-to-b from-mint to-ochre" style={{ scaleY: progress }} />
          </div>
          <div aria-hidden className="absolute left-8 right-8 top-[2.75rem] hidden h-1 rounded-full bg-line lg:block">
            <motion.div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-mint via-accent to-ochre" style={{ scaleX: progress }} />
          </div>

          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <Reveal delay={i * 0.12} className="flex gap-5 lg:block">
                <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg shadow-glow lg:mb-6 lg:h-[5.5rem] lg:w-[5.5rem] lg:rounded-3xl">
                  <s.icon className="h-6 w-6 lg:h-9 lg:w-9" aria-hidden />
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ochre font-display text-sm font-bold text-ink">
                    {i + 1}
                  </span>
                </div>
                <div className="glass flex-1 rounded-3xl p-6 shadow-soft transition-transform duration-300 hover:-translate-y-1">
                  <h3 className="text-2xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-fg-muted">{s.text}</p>
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-fg/5 px-3 py-1 text-sm font-semibold">
                    <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                    Statut : {s.status}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

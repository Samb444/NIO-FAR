import { ArrowRight } from 'lucide-react';
import { ButtonLink } from './ButtonLink';
import { LogoMark } from './Logo';
import { Reveal } from './Reveal';

export function CallToAction() {
  return (
    <section aria-labelledby="cta-title" className="pb-16 pt-4">
      <Reveal className="mx-auto max-w-4xl px-5 text-center">
        <LogoMark className="mx-auto h-16 w-16 nf-bob" />
        <h2 id="cta-title" className="mt-6 text-4xl font-extrabold sm:text-5xl">
          Votre rue mérite d’être <span className="text-accent">entendue.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
          Un tas d’ordures, une rue inondée, un lampadaire éteint ? Commencez par le signaler.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/signaler" variant="primary">
            Signaler un problème
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </ButtonLink>
          <ButtonLink to="/signalements" variant="secondary">
            Voir les signalements
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}

import { ArrowLeft, Hammer } from 'lucide-react';
import { ButtonLink } from '../components/ButtonLink';
import { useEffect } from 'react';

/** Page provisoire pour les fonctionnalités des étapes suivantes. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} — NIO FAR`;
    return () => {
      document.title = 'NIO FAR — Les problèmes de votre quartier, enfin suivis.';
    };
  }, [title]);

  return (
    <section aria-labelledby="page-title" className="relative grid min-h-[80svh] place-items-center px-5 pb-16 pt-32">
      <div aria-hidden className="pointer-events-none absolute -right-20 top-20 -z-10 h-96 w-96 rounded-full bg-mint/20 blur-3xl" />
      <div className="glass max-w-xl rounded-4xl p-8 text-center shadow-soft sm:p-12">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ochre text-ink">
          <Hammer size={30} aria-hidden />
        </div>
        <h1 id="page-title" className="mt-6 text-4xl font-extrabold sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-fg-muted">{description}</p>
        <p className="mt-2 text-sm font-semibold text-accent">En cours de construction — prochaine étape du prototype.</p>
        <ButtonLink to="/" variant="secondary" className="mt-8">
          <ArrowLeft size={18} aria-hidden />
          Retour à l’accueil
        </ButtonLink>
      </div>
    </section>
  );
}

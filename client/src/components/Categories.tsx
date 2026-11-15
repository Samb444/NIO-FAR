import { categories } from '../lib/categories';
import { categoryColors } from '../lib/tokens';
import { CategoryIcon } from './CategoryIcon';
import { Reveal, SectionHeading } from './Reveal';

export function Categories() {
  return (
    <section id="categories" aria-labelledby="cat-title" className="relative py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 mx-auto h-96 max-w-4xl rounded-full bg-mint/15 blur-3xl" />
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          id="cat-title"
          eyebrow="Les 4 catégories"
          title={
            <>
              Ce que l’on peut <span className="text-accent">signaler.</span>
            </>
          }
          intro="Un périmètre volontairement resserré sur les problèmes de proximité les plus visibles, pour des signalements clairs et comparables."
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
            <li key={c.id}>
              <Reveal delay={i * 0.1} className="h-full">
                <article className="glass group relative flex h-full flex-col overflow-hidden rounded-4xl p-6 shadow-soft transition-transform duration-300 hover:-translate-y-1.5">
                  <div
                    aria-hidden
                    className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
                    style={{ background: categoryColors[c.id] }}
                  />
                  <div
                    className="relative mb-6 grid h-28 w-28 place-items-center rounded-3xl p-3 text-ink dark:text-sand"
                    style={{ background: `${categoryColors[c.id]}26` }}
                  >
                    <CategoryIcon id={c.id} />
                  </div>
                  <h3 className="text-2xl font-bold">{c.label}</h3>
                  <p className="mt-2 text-fg-muted">{c.description}</p>
                  <p className="mt-auto pt-5 text-sm">
                    <span className="font-semibold">Exemples : </span>
                    <span className="text-fg-muted">{c.examples}</span>
                  </p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

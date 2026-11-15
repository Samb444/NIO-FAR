import { Phone } from 'lucide-react';

/** Bannière permanente : NIO FAR n'est pas un service d'urgence. */
export function BanniereUrgence() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border border-[#C8553D]/40 bg-[#C8553D]/10 px-4 py-3 text-sm">
      <Phone size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p>
        <strong>En danger immédiat :</strong>{' '}
        <a className="font-bold underline underline-offset-2" href="tel:18">Pompiers 18</a> ·{' '}
        <a className="font-bold underline underline-offset-2" href="tel:17">Police 17</a> ·{' '}
        <a className="font-bold underline underline-offset-2" href="tel:1515">SAMU 1515</a>.{' '}
        NIO FAR n’est pas un service d’urgence.
      </p>
    </div>
  );
}

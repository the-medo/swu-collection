import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import PromoCardFan from './PromoCardFan.tsx';

export default function PromoCardsTile({ printings }: { printings: CardPrinting[] }) {
  return (
    <Link
      to="/cards/promos"
      className="group/promo-tile relative isolate flex min-h-96 flex-col justify-between rounded-2xl border border-amber-400/40 bg-slate-950 text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_top_right,_#92400e80,_transparent_65%)]"
      />
      <div className="relative mx-auto w-full max-w-md px-2 pt-3">
        <PromoCardFan printings={printings} spreadOnHover />
      </div>
      <div className="relative space-y-3 p-6">
        <Sparkles className="size-8 text-amber-300" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300">
          Something out of the ordinary
        </p>
        <h3 className="text-3xl font-semibold">Promo and special cards</h3>
        <p className="max-w-xs text-sm leading-relaxed text-slate-300">
          Discover promos, rare treatments, and curated collections worth a closer look.
        </p>
        <span className="inline-flex items-center gap-2 pt-3 text-sm font-medium">
          Explore the collections <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

import { CurrencyIcon } from '@/components/app/global/CurrencyIcon';
import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupportArtwork } from '@/components/app/support/SupportArtwork';

export function CurrencyAbout() {
  return (
    <section aria-label="About beskar and credits" className="@container space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="m-0! flex items-center gap-2 border-0! p-0! text-lg! font-semibold!">
            <CurrencyIcon currency="credits" className="size-8" />
            Credits
          </h2>
          <p className="text-sm">
            Credits add up with each contribution. Your balance sets the model budget for each
            Battlefield layout: add ships, planets and other objects up to that budget.
          </p>
          <p className="text-sm text-muted-foreground">
            Every account starts with 10,000 credits. Saving a layout does not spend credits, and
            you never lose them. Reuse the same budget across all your Battlefields.
          </p>
        </article>
        <article className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="m-0! flex items-center gap-2 border-0! p-0! text-lg! font-semibold!">
            <CurrencyIcon currency="beskar" className="size-8" />
            Beskar
          </h2>
          <p className="text-sm">
            Beskar is your spendable currency. Use it in the shop to buy additional achievement
            slots for your profile or slots for more saved Battlefields.
          </p>
          <p className="text-sm text-muted-foreground">
            Each purchase deducts its price from your beskar balance and adds a slot to your
            account. Your purchase history is in Transactions.
          </p>
        </article>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid @3xl:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
            <h2 className="m-0! border-0! p-0! text-xl! font-semibold!">
              A thank-you to our supporters
            </h2>
            <p className="text-sm">
              SWUBASE is free to use, and I plan to keep it that way for as long as possible.
            </p>
            <p className="text-sm text-muted-foreground">
              To thank everyone who helps keep the site running, supporters automatically receive
              two currencies: beskar and extra credits.
            </p>
            <p className="text-sm">Every $1 USD of support earns 1,000 credits and 1 beskar.</p>
            <Button asChild className="support-accent w-fit rounded-xl">
              <Link to="/support">
                <Heart className="size-4 fill-current" strokeWidth={2.5} aria-hidden="true" />
                Support SWUBASE
              </Link>
            </Button>
          </div>
          <SupportArtwork className="min-h-56 @3xl:min-h-80" />
        </div>
        <p className="border-t border-border bg-muted/50 px-5 py-3 text-sm sm:px-6">
          <span className="font-medium">Purely cosmetic.</span> Use them to show off, customize your
          Battlefields and make your profile your own.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Your balances and transaction history are private on your profile.
      </p>
    </section>
  );
}

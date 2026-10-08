import { CurrencyIcon } from '@/components/app/global/CurrencyIcon';
import { PATREON_LINK } from '../../../../../../shared/consts/constants';

export function CurrencyAbout() {
  return (
    <section aria-label="About beskar and credits" className="space-y-5">
      <div className="space-y-3 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="m-0! border-0! p-0! text-lg! font-semibold!">
          A thank-you to our supporters
        </h2>
        <p className="text-sm">
          SWUBASE is free to use, and I plan to keep it that way for as long as possible.
        </p>
        <p className="text-sm text-muted-foreground">
          To thank everyone who helps keep the site running, supporters automatically receive two
          currencies: beskar and extra credits.
        </p>
        <p className="rounded-md bg-muted/50 p-3 text-sm">
          <span className="font-medium">Purely cosmetic.</span> Use them to show off, customize your
          Battlefields and make your profile your own.
        </p>
      </div>
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
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="m-0! border-0! p-0! text-base! font-semibold!">How to get more</h2>
        <p className="text-sm">
          Supporting SWUBASE on Patreon earns 1,000 credits and 1 beskar per $1 USD of support.
          Fractional amounts count too: $2.50 earns 2,500 credits and 2.5 beskar.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the same email for Patreon and your verified SWUBASE account so your support can be
          matched. Administrators can also award either currency.
        </p>
        <a
          href={PATREON_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          Support on Patreon
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        Your balances and transaction history are private on your profile.
      </p>
    </section>
  );
}

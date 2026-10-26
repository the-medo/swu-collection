import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import logo from '@/assets/logo-dark-theme.svg';

export function AuthPageFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:py-16">
      <Helmet title={`${title} | SWUBASE`}>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <section className="w-full max-w-md self-start overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <img src={logo} alt="" className="size-10 brightness-0 dark:brightness-100" />
          <span className="text-xl tracking-tight">
            SWU<strong>BASE</strong>
          </span>
        </div>
        <h1 className="mb-5! text-[28px]! leading-tight! tracking-tight">{title}</h1>
        {children}
      </section>
    </div>
  );
}

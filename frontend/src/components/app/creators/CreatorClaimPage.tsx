import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Layers,
  PenLine,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import { creatorKeys, hubApi, useHubQuery } from '@/api/creators';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useSession } from '@/lib/auth-client.ts';
import { CreatorAvatar, CreatorLayout } from './CreatorLayout.tsx';
import { Status } from './CreatorControls.tsx';
import { YoutubeClaimButton } from './YoutubeClaim.tsx';
import {
  creatorDescription,
  creatorHeading,
  creatorLink,
  creatorSubheading,
} from './creatorStyles.ts';

const steps = [
  {
    title: 'Choose your channel',
    description: 'Use the Google account that manages the YouTube channel shown on this profile.',
  },
  {
    title: 'Confirm ownership',
    description: 'We match your YouTube channel to this creator profile.',
  },
  {
    title: 'Make yourself at home',
    description: 'Head to your creator studio to update your profile and manage your content.',
  },
];

export function CreatorClaimPage({ slug }: { slug: string }) {
  const session = useSession();
  const query = useHubQuery(creatorKeys.profile(slug), () => hubApi.profile(slug));
  const profile = query.data;
  const user = session.data?.user;

  return (
    <CreatorLayout>
      <Helmet title={`Claim ${profile?.name ?? 'your creator profile'} | SWUBASE`} />
      <Link
        to="/creators/$slug"
        params={{ slug }}
        className={`${creatorLink} flex w-fit items-center gap-2 py-2`}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to {profile?.name ?? 'creator'}
      </Link>
      {!profile ? (
        <Status loading={query.isPending} error={query.error} />
      ) : (
        <>
          <section className="grid overflow-hidden rounded-[24px] border border-border bg-card lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="relative isolate flex min-w-0 flex-col gap-8 overflow-hidden bg-[#17352e] p-6 text-[#fffaf0] sm:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,#79936b50,transparent_70%)]"
              />
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#dce7a0]">
                <BadgeCheck size={16} aria-hidden="true" /> Creator ownership
              </div>
              <div className="grid gap-5">
                <h1 className="m-0! border-0! p-0! text-[38px]! font-semibold! leading-[1.05]! tracking-[-0.045em]! sm:text-[52px]!">
                  Your channel.
                  <br />
                  Your creative home.
                </h1>
                <p className="m-0! max-w-md text-[14px]! leading-[1.8]! text-[#fffaf0]/80">
                  Claim your creator profile and give your community a place to find everything you
                  make.
                </p>
              </div>
              <div className="mt-auto flex min-w-0 items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                <CreatorAvatar
                  name={profile.name}
                  src={profile.avatarUrl}
                  className="border-white/10"
                />
                <div className="grid min-w-0 gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#dce7a0]">
                    Your creator profile
                  </span>
                  <h2 className={`${creatorHeading} text-[#fffaf0]`}>{profile.name}</h2>
                  <span className="break-all text-xs text-[#fffaf0]/60">
                    swubase.com/creators/{profile.slug}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-6 p-6 sm:p-10">
              {session.isPending ? (
                <Status compact loading />
              ) : profile.ownerId ? (
                <>
                  <BadgeCheck className="size-10 text-[var(--creator-accent)]" aria-hidden="true" />
                  <h2 className={creatorHeading}>
                    {profile.ownerId === user?.id
                      ? 'This profile is yours'
                      : 'This profile is already claimed'}
                  </h2>
                  <p className={creatorDescription}>
                    {profile.ownerId === user?.id
                      ? 'Your channel is connected. Everything you need to manage your profile is in your creator studio.'
                      : 'This creator profile already has an owner. You can explore their content on the profile page.'}
                  </p>
                  {profile.ownerId === user?.id ? (
                    <Button asChild className="w-fit rounded-xl">
                      <Link to="/creator-studio" search={{ creatorId: profile.id }}>
                        Open creator studio <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Link to="/creators/$slug" params={{ slug }} className={creatorLink}>
                      View creator profile →
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    <Youtube aria-hidden="true" />
                  </div>
                  <div className="grid gap-3">
                    <h2 className={creatorHeading}>Claim this profile</h2>
                    <p className={creatorDescription}>
                      Connect the YouTube channel behind {profile.name}. Once we confirm the match,
                      this profile becomes yours to manage.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {user ? (
                      <YoutubeClaimButton
                        creatorId={profile.id}
                        variant="default"
                        className="min-h-12 w-full justify-center rounded-xl px-5 py-3 text-center"
                      >
                        Connect YouTube to claim
                      </YoutubeClaimButton>
                    ) : (
                      <SignIn
                        trigger={
                          <Button className="min-h-12 w-full rounded-xl">
                            Sign in to get started <ArrowRight aria-hidden="true" />
                          </Button>
                        }
                      />
                    )}
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      {user
                        ? 'Choose the Google account that manages this channel.'
                        : 'Sign in to SWUBASE, then connect your YouTube channel.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 border-t border-border pt-5">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-[var(--creator-accent)]"
                      aria-hidden="true"
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      We use read-only YouTube access to verify your channel. SWUBASE cannot upload,
                      edit, or delete your YouTube videos.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
          {!profile.ownerId && (
            <>
              <section
                aria-label="How claiming works"
                className="grid gap-6 px-2 py-4 md:grid-cols-3 sm:px-4"
              >
                {steps.map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--creator-soft)] text-xs font-semibold text-[var(--creator-accent)]">
                      {index + 1}
                    </span>
                    <div className="grid gap-2">
                      <h2 className={creatorSubheading}>{step.title}</h2>
                      <p className={creatorDescription}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </section>
              <section
                className="grid gap-6 rounded-[20px] border border-[var(--creator-border)] bg-[var(--creator-soft)] p-5 sm:p-6 md:grid-cols-2"
                aria-label="Your creator studio"
              >
                <div className="flex items-start gap-3">
                  <PenLine
                    size={20}
                    className="shrink-0 text-[var(--creator-accent)]"
                    aria-hidden="true"
                  />
                  <div className="grid gap-2">
                    <h2 className={creatorSubheading}>Make it your own</h2>
                    <p className={creatorDescription}>
                      Update your bio, branding, and links. Publish and organize your content from
                      one creator studio.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Layers
                    size={20}
                    className="shrink-0 text-[var(--creator-accent)]"
                    aria-hidden="true"
                  />
                  <div className="grid gap-2">
                    <h2 className={creatorSubheading}>Your decklists come with you</h2>
                    <p className={creatorDescription}>
                      Decklists imported for your videos move to your account as unlisted decks.
                      They stay linked to the original content.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </CreatorLayout>
  );
}

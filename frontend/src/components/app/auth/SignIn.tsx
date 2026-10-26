import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { signIn, useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { NavUser } from '@/components/app/auth/NavUser.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import swubaseLogo from '@/assets/logo-dark-theme.svg';
import { EmailAuthForm } from './EmailAuthForm.tsx';
import { useEmailAuthConfig } from '@/api/auth/useEmailAuthConfig.ts';
import { safeAuthReturnTo } from '../../../../../shared/auth.ts';

const providers = [
  {
    id: 'google',
    name: 'Google',
    icon: 'M11.99 13.9v-3.72h9.36c.14.63.25 1.22.25 2.05c0 5.71-3.83 9.77-9.6 9.77c-5.52 0-10-4.48-10-10S6.48 2 12 2c2.7 0 4.96.99 6.69 2.61l-2.84 2.76c-.72-.68-1.98-1.48-3.85-1.48c-3.31 0-6.01 2.75-6.01 6.12s2.7 6.12 6.01 6.12c3.83 0 5.24-2.65 5.5-4.22h-5.51z',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2',
  },
] as const;

type Provider = (typeof providers)[number]['id'];

interface SignInProps {
  defaultOpen?: boolean;
  returnTo?: string;
  isLeftSidebar?: boolean;
  // Custom label for the trigger button
  buttonText?: string;
  // Force using a text button instead of the compact icon trigger
  forceTextButton?: boolean;
  trigger?: ReactElement;
}

export default function SignIn({
  defaultOpen = false,
  returnTo,
  isLeftSidebar,
  buttonText,
  forceTextButton = false,
  trigger,
}: SignInProps) {
  const { open } = useSidebar();
  const session = useSession();
  const emailAuth = useEmailAuthConfig();
  const [emailPending, setEmailPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const redirectStarted = useRef(false);
  const emailRedirectStarted = useRef(false);

  useEffect(() => {
    // Back from the provider may restore this page without remounting React.
    const handlePageShow = () => {
      redirectStarted.current = false;
      emailRedirectStarted.current = false;
      setPendingProvider(null);
      setEmailPending(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const handleSignIn = useCallback(
    async (provider: Provider) => {
      redirectStarted.current = false;
      setPendingProvider(provider);
      setSignInError(null);
      try {
        sessionStorage.setItem('needsSettingsSync', '1');
        const { data, error } = await signIn.social({
          provider,
          // Return to the current page, except a completed sign-in must leave
          // the error page (including sign-ins from the sidebar).
          callbackURL: safeAuthReturnTo(
            returnTo ?? window.location.pathname + window.location.search + window.location.hash,
          ),
          errorCallbackURL: '/auth/error',
        });
        if (error) {
          setSignInError('We couldn’t start sign-in. Please try again.');
        }
        // Better Auth starts navigation before resolving. Keep both providers
        // disabled until we leave, unless the response did not start a redirect.
        redirectStarted.current = !error && !!data?.redirect && !!data.url;
        if (!redirectStarted.current) setPendingProvider(null);
      } catch {
        setSignInError('We couldn’t connect. Check your connection and try again.');
        setPendingProvider(null);
      }
    },
    [returnTo],
  );

  if (session.data && isLeftSidebar) {
    return <NavUser />;
  }

  return (
    <Dialog
      defaultOpen={defaultOpen}
      onOpenChange={isOpen => {
        if (!isOpen) return;
        setSignInError(null);
        if (emailRedirectStarted.current) {
          emailRedirectStarted.current = false;
          setEmailPending(false);
        }
        // Allow a fresh attempt if the user stopped the provider navigation.
        // An API request still in flight must continue to disable both buttons.
        if (redirectStarted.current) {
          redirectStarted.current = false;
          setPendingProvider(null);
        }
      }}
    >
      <DialogTrigger asChild disabled={session.isPending}>
        {trigger ??
          (open || forceTextButton ? (
            <Button>{session.isPending ? '...' : (buttonText ?? 'Sign In')}</Button>
          ) : (
            <Button size="icon" className="h-8 w-8 [&_svg]:size-4" aria-label="Sign in">
              <LogIn aria-hidden="true" />
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent
        className={cn(
          'max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[440px] gap-0 overflow-y-auto',
          'rounded-3xl border-border bg-card p-0 text-card-foreground shadow-2xl sm:rounded-3xl',
        )}
      >
        <div className="px-6 pb-6 pt-8 sm:px-8 sm:pb-8">
          <div className="mb-7 flex items-center gap-3" aria-hidden="true">
            <img
              src={swubaseLogo}
              alt=""
              width={40}
              height={40}
              className="size-10 brightness-0 dark:brightness-100"
            />
            <span className="text-xl tracking-[-0.05em]">
              <span className="font-normal">SWU</span>
              <span className="font-bold">BASE</span>
            </span>
          </div>
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="m-0! border-0! p-0! text-[28px]! font-semibold! leading-tight! tracking-[-0.04em]!">
              Sign in to your base.
            </DialogTitle>
            <DialogDescription className="text-sm leading-6!">
              Your decks, your collection, your community.
              <br />
              Keep it all together with SWUBASE.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-7 grid gap-3">
            {providers.map(provider => (
              <Button
                key={provider.id}
                variant="outline"
                className={cn(
                  'h-12 w-full justify-start gap-3 rounded-xl px-4 [&_svg]:size-5',
                  provider.id === 'google'
                    ? 'border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                    : 'bg-card hover:bg-muted/50',
                )}
                disabled={pendingProvider !== null || emailPending}
                onClick={() => handleSignIn(provider.id)}
              >
                {pendingProvider === provider.id ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d={provider.icon} />
                  </svg>
                )}
                <span className="flex-1 text-left">
                  {pendingProvider === provider.id ? 'Connecting to' : 'Sign in with'}{' '}
                  {provider.name}
                </span>
                <ArrowRight className="opacity-50" aria-hidden="true" />
              </Button>
            ))}
          </div>
          <span role="status" className="sr-only">
            {pendingProvider &&
              `Connecting to ${providers.find(provider => provider.id === pendingProvider)?.name}.`}
          </span>
          {signInError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm leading-5! text-foreground"
            >
              {signInError}
            </p>
          )}
          {emailAuth.data?.enabled && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>
              <EmailAuthForm
                returnTo={safeAuthReturnTo(
                  returnTo ??
                    window.location.pathname + window.location.search + window.location.hash,
                )}
                disabled={pendingProvider !== null || emailPending}
                onPendingChange={setEmailPending}
                onNavigate={() => {
                  emailRedirectStarted.current = true;
                }}
              />
            </>
          )}
          {!emailAuth.data?.enabled && (
            <p className="mt-5 text-xs leading-5! text-muted-foreground">
              New here? Signing in creates your free account.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border bg-muted/20 px-6 py-3 sm:px-8">
          <span className="text-xs text-muted-foreground">Just looking around?</span>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="-mr-2 rounded-lg text-xs">
              Keep browsing
              <ArrowRight aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

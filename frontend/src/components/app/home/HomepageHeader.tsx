import SocialButtons from '@/components/app/global/SocialButtons.tsx';

export function HomepageHeader() {
  return (
    <header className="flex gap-4 justify-between px-2 pb-2">
      <div className="flex flex-1 flex-col">
        <h1 className="text-center font-medium text-foreground/80 mb-0">
          <span className="font-normal">SWU</span>
          <span className="font-bold">BASE</span>
        </h1>
        <h4 className="text-center font-medium text-foreground/80">
          Your Ultimate Star Wars: Unlimited Companion
        </h4>
      </div>

      <SocialButtons location="header" />
    </header>
  );
}


import SignIn from '@/components/app/auth/SignIn.tsx';

export default function McpLogin() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Connect your agent to SWUBASE</h1>
      <p>
        Sign in with your SWUBASE account. You will then be asked to approve card-search access for
        your agent.
      </p>
      <SignIn forceTextButton buttonText="Sign in to continue" isLeftSidebar={false} />
    </main>
  );
}

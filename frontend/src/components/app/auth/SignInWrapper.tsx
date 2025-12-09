import React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';

export interface SignInWrapperProps {
  children: React.ReactNode;
  text?: string;
}

// Renders children if user is signed in, otherwise shows SignIn trigger with custom text
const SignInWrapper: React.FC<SignInWrapperProps> = ({ children, text }) => {
  const user = useUser();

  if (user) return <>{children}</>;

  return <SignIn buttonText={text} forceTextButton />;
};

export default SignInWrapper;

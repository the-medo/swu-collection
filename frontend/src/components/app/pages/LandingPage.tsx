import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { BookCheck, BookOpen, ScrollText } from 'lucide-react';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand';
import LogoLightTheme from '../../../assets/logo-light-theme.svg';
import LogoDarkTheme from '../../../assets/logo-dark-theme.svg';
import { useTheme } from '@/components/theme-provider';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  delay: number;
}

const FeatureCard = ({ title, description, icon, to, delay }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
      <Link
        to={to}
        className="relative flex flex-col h-full gap-2 p-6 bg-card rounded-lg border shadow-md hover:shadow-lg transition-all duration-300"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold">{title}</h3>
          <div className="text-primary">{icon}</div>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </Link>
    </motion.div>
  );
};

const LandingPage: React.FC = () => {
  const { theme } = useTheme();
  const user = useUser();

  const features = [
    {
      title: 'Browse Decks',
      description: 'Explore community decks, find inspiration, and share your own creations.',
      icon: <BookCheck size={24} />,
      to: '/decks/public',
      delay: 0.1,
    },
    {
      title: 'Collections',
      description: 'Track your Star Wars: Unlimited card collection with ease.',
      icon: <BookOpen size={24} />,
      to: '/collections/public',
      delay: 0.2,
    },
    {
      title: 'Wantlists',
      description: 'Create and share wantlists to complete your collection.',
      icon: <ScrollText size={24} />,
      to: '/wantlists/public',
      delay: 0.3,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto px-4 py-10">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xs mx-auto mb-8 flex justify-center"
      >
        <img
          src={theme === 'light' ? LogoLightTheme : LogoDarkTheme}
          alt="SWU Base Logo"
          className="w-full max-w-md"
        />
      </motion.div>

      {/* Tagline */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-2xl md:text-3xl text-center font-medium mb-8 text-foreground/80"
      >
        Your Ultimate Star Wars: Unlimited Companion
      </motion.h2>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-2xl mx-auto mb-12"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-primary/20 rounded-lg blur-md"></div>
          <div className="relative bg-card border rounded-lg p-2">
            <CardSearchCommand id="card-search-homepage" />
          </div>
        </div>
      </motion.div>

      {/* CTA for non-logged in users */}
      {!user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full max-w-md mx-auto mb-12 text-center"
        >
          <p className="mb-4 text-muted-foreground">
            Sign in to build decks, track collections, and more!
          </p>
          <Button size="lg" asChild>
            Get Started
          </Button>
        </motion.div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;

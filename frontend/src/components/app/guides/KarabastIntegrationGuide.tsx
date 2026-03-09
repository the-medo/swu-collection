import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';

interface StepProps {
  stepNumber: number;
  title: string;
  description: React.ReactNode;
}

const Step: React.FC<StepProps> = ({ stepNumber, title, description }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {stepNumber}
        </span>
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="w-full rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm border border-dashed">
        <img
          src={`https://images.swubase.com/guides/karabast-integration/step-${stepNumber}.webp`}
          title={`Step ${stepNumber} screenshot`}
          className="rounded-lg"
          alt={`Step ${stepNumber} screenshot`}
        />
      </div>
    </CardContent>
  </Card>
);

const KarabastIntegrationGuide: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-4">
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-1">Connect Karabast to SWUBase</h3>
        <p className="text-muted-foreground">
          Link your Karabast account to track your game statistics on SWUBase. Follow the steps
          below to get started.
        </p>
      </div>

      <Step
        stepNumber={1}
        title="Open Karabast, go to Preferences"
        description={
          <div className="flex flex-col gap-2">
            <div>
              Go to Karabast preferences and scroll down until you find the SWUBase integration
              button. You need to be logged in on both Karabast and SWUBase.
            </div>
            <div>
              You can also follow this link:{' '}
              <Button variant="link" className="px-1 py-0 h-auto" asChild>
                <a href="https://karabast.net/Preferences" target="_blank">
                  Karabast Preferences
                </a>
              </Button>
            </div>
          </div>
        }
      />

      <Step
        stepNumber={2}
        title="Approve the Connection"
        description="The button will open a SWUBase page — approve the account connection to allow Karabast to sync your data."
      />

      <Step
        stepNumber={3}
        title="Confirm the Link"
        description="You should be redirected back to Karabast. Your integration button should now be green, indicating a successful connection."
      />

      <Step
        stepNumber={4}
        title="Start Playing!"
        description="Use SWUBase deck links when playing on Karabast to automatically track your game stats and matchup data."
      />
    </div>
  );
};

export default KarabastIntegrationGuide;

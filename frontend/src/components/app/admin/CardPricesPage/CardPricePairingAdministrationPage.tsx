import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import CardPricePairingCardmarket from '@/components/app/admin/CardPricesPage/PairingCardmarket/CardPricePairingCardmarket.tsx';
import CardPricePairingTCGPlayer from '@/components/app/admin/CardPricesPage/PairingTCGPlayer/CardPricePairingTCGPlayer.tsx';

const CardPricePairingAdministrationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="cardmarket">
        <TabsList>
          <TabsTrigger value="cardmarket">Cardmarket</TabsTrigger>
          <TabsTrigger value="tcgplayer">TCGplayer</TabsTrigger>
        </TabsList>
        <TabsContent value="cardmarket">
          <CardPricePairingCardmarket />
        </TabsContent>
        <TabsContent value="tcgplayer">
          <CardPricePairingTCGPlayer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { CardPricePairingAdministrationPage };

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import CardPricePairingCardmarket from '@/components/app/admin/CardPricesPage/PairingCardmarket/CardPricePairingCardmarket.tsx';
import CardPricePairingTCGPlayer from '@/components/app/admin/CardPricesPage/PairingTCGPlayer/CardPricePairingTCGPlayer.tsx';
import UnmatchedCardPrices from '@/components/app/admin/CardPricesPage/Unmatched/UnmatchedCardPrices.tsx';

const CardPricePairingAdministrationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="cardmarket">
        <TabsList>
          <TabsTrigger value="cardmarket">Cardmarket</TabsTrigger>
          <TabsTrigger value="tcgplayer">TCGplayer</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
        </TabsList>
        <TabsContent value="cardmarket">
          <CardPricePairingCardmarket />
        </TabsContent>
        <TabsContent value="tcgplayer">
          <CardPricePairingTCGPlayer />
        </TabsContent>
        <TabsContent value="unmatched">
          <UnmatchedCardPrices />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { CardPricePairingAdministrationPage };

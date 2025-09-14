import * as React from 'react';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';

interface DeckCollectionInfoProps {}

const DeckCollectionInfo: React.FC<DeckCollectionInfoProps> = ({}) => {
  const { data } = useUserCollectionsData();

  console.log({ data });

  return null;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

export default DeckCollectionInfo;

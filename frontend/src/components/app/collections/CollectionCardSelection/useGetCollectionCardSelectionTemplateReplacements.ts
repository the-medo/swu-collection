import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { useUser } from '@/hooks/useUser.ts';
import { collectionTypeTitle } from '../../../../../../types/iterableEnumInfo.ts';
import { CollectionType } from '../../../../../../types/enums.ts';

const hasForTemplate = {
  [CollectionType.COLLECTION]: 'wants from',
  [CollectionType.WANTLIST]: 'has for',
  [CollectionType.OTHER]: '<=>',
};

export const useGetCollectionCardSelectionTemplateReplacements = (collectionId: string) => {
  const { data } = useGetCollection(collectionId);
  const user = useUser();

  const collectionType = data?.collection?.collectionType;

  return {
    date: new Date().toLocaleDateString(),
    userNameCollectionOwner: data?.user.displayName ?? '',
    // @ts-expect-error TODO - solve user extension type
    userName: user?.displayName ?? '',
    collectionTypeOriginal: collectionType ? collectionTypeTitle[collectionType] : '',
    hasFor: collectionType ? hasForTemplate[collectionType] : '<=>',
    collectionName: data?.collection?.title ?? '',
  };
};

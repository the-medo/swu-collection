import { Helmet } from 'react-helmet-async';
import { Earth, Plus } from 'lucide-react';
import { CollectionType } from '../../../../../types/enums.ts';
import { AuthorizedRouteComponent } from '@/routes/_authenticated.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import {
  BrowseHeader,
  BrowsePage,
  BrowseTabs,
} from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import {
  CardListIcon,
  CollectionIcon,
  WantlistIcon,
} from '@/components/app/global/icons/CardLibraryIcons.tsx';
import PublicCollections from './PublicCollections/PublicCollections.tsx';
import UserCollections from './UserCollections/UserCollections.tsx';

const collections = {
  [CollectionType.COLLECTION]: {
    title: 'Collections',
    singular: 'collection',
    path: 'collections',
    icon: CollectionIcon,
    personal:
      'Keep your cards organized, track their value, and see what you have for your next deck.',
    public: 'Explore the community’s collections and find collectors near you.',
  },
  [CollectionType.WANTLIST]: {
    title: 'Wantlists',
    singular: 'wantlist',
    path: 'wantlists',
    icon: WantlistIcon,
    personal:
      'Keep track of the cards you’re looking for and share your next finds with other collectors.',
    public:
      'See what other players are looking for. Your spare cards could be their next great find.',
  },
  [CollectionType.OTHER]: {
    title: 'Card lists',
    singular: 'card list',
    path: 'lists',
    icon: CardListIcon,
    personal: 'Build a list for your next project, trade, or collection goal.',
    public: '',
  },
};

export default function CollectionBrowsePage({
  collectionType,
  scope,
}: {
  collectionType: CollectionType;
  scope: 'your' | 'public';
}) {
  const user = useUser();
  const info = collections[collectionType];
  const personal = scope === 'your';
  const title = personal ? `Your ${info.title.toLowerCase()}` : info.title;
  const page = (
    <BrowsePage>
      <BrowseHeader
        eyebrow={personal ? 'Your card library' : 'The collecting community'}
        title={title}
        icon={info.icon}
        description={personal ? info.personal : info.public}
      >
        <NewCollectionDialog
          collectionType={collectionType}
          trigger={
            <Button>
              <Plus className="size-4" />
              New {info.singular}
            </Button>
          }
        />
      </BrowseHeader>
      {collectionType !== CollectionType.OTHER && (
        <BrowseTabs
          label={`${info.title} navigation`}
          items={[
            {
              title: `Your ${info.title.toLowerCase()}`,
              to: `/${info.path}/your`,
              active: personal,
              icon: info.icon,
            },
            {
              title: `Public ${info.title.toLowerCase()}`,
              to: `/${info.path}/public`,
              active: !personal,
              icon: Earth,
            },
          ]}
        />
      )}
      {personal ? (
        <UserCollections
          browse
          userId={user?.id}
          loading={!user}
          collectionType={collectionType}
          includeEntityPrices={collectionType !== CollectionType.OTHER}
        />
      ) : (
        <PublicCollections collectionType={collectionType} />
      )}
    </BrowsePage>
  );
  return (
    <>
      <Helmet title={`${title} | SWUBase`} />
      {personal ? <AuthorizedRouteComponent title={title}>{page}</AuthorizedRouteComponent> : page}
    </>
  );
}

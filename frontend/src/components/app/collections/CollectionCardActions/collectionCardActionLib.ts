import { CollectionType } from '../../../../../../types/enums.ts';

export type CollectionCardActionItems = {
  items: AddMultipleCollectionCardsItem[];
};

type CollectionCardActionStepConfiguration = {
  title?: string;
  description?: string;
};

export type CollectionCardActionConfiguration = {
  /**
   * Step 1 is the collection type selection step
   */
  step1?: CollectionCardActionStepConfiguration & {
    /**
     * if this is set, only the collection types in this array will be shown
     */
    allowedCollectionTypes?: CollectionType[];
    /**
     * custom titles and descriptions for each collection type
     * if this is not set, the default titles and descriptions will be used
     */
    collectionTypeData?: Record<
      CollectionType,
      | {
          title?: string;
          description?: string;
        }
      | undefined
    >;
    /**
     * if this is set, step 1 will be skipped and the default collection type will be used
     * if this is not set, step 1 will be shown and the user will be able to select a collection type
     */
    defaultSelectedCollectionType?: CollectionType;
  };

  /**
   * Step 2 is the collection selection step
   * Users can either create a new collection or add to an existing collection, based on a setting
   */
  step2?: CollectionCardActionStepConfiguration & {
    /**
     * if this is set, the user will be able to create a new collection
     */
    allowCreate?: boolean;
    /**
     * if this is set, the user will be able to add to an existing collection
     */
    allowExisting?: boolean;
    /**
     * if is set, predefined values of title and description will be used by default
     * if this is not set, the user will have to put their own title and description
     * if disable is true, the user will NOT be able to edit the title and description
     * if allowCreate is false, this setting will be ignored
     */
    create?: {
      predefinedTitle?: string;
      predefinedDescription?: string;
      disable?: boolean;
    };
    /**
     * if is existing.preselectedId is set, this option will be preselected
     * if disable is true, the user will NOT be able to select different collection
     * if allowExisting is false, this setting will be ignored
     */
    existing?: {
      preselectedId?: string;
      disable?: boolean;
    };
  };

  /**
   * Step 3 is the finalization step
   * Users can either add or remove cards from the collection
   */
  step3?: CollectionCardActionStepConfiguration & {
    /**
     * Buttons of final actions will be displayed based on this setting (in this order)
     * if this is not set, both buttons will be displayed
     */
    allowedActions?: ('add' | 'remove')[];
  };
};

// Default configuration for Collection Card Actions
// This mirrors the existing UI/behavior when no configuration is supplied
export const defaultCollectionCardActionConfiguration: CollectionCardActionConfiguration = {
  step1: {
    allowedCollectionTypes: [
      CollectionType.COLLECTION,
      CollectionType.WANTLIST,
      CollectionType.OTHER,
    ],
    collectionTypeData: {
      [CollectionType.COLLECTION]: {
        title: 'Add to collection',
        description: 'You have these cards and want to add them to collection.',
      },
      [CollectionType.WANTLIST]: {
        title: 'Add to wantlist',
        description: 'You want these cards.',
      },
      [CollectionType.OTHER]: {
        title: 'Add to card list',
        description: 'Special-purpose lists, for example proxies',
      },
    },
  },
  step2: {
    allowCreate: true,
    allowExisting: true,
  },
  step3: {
    allowedActions: ['add', 'remove'],
  },
};

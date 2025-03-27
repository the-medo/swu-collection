import type { CollectionType } from './enums.ts';

export interface Collection {
  id: string;
  userId: string;
  title: string;
  description: string;
  collectionType: CollectionType;
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

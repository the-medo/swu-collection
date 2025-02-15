export interface Collection {
  id: string;
  userId: string;
  title: string;
  description: string;
  wantlist: boolean;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
}

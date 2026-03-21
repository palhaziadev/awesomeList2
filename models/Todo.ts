export type Item = {
  itemId: string;
  itemName: string;
  itemDescription?: string;
  translation?: string;
  translationOverride?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type TodoItem = Item & {
  isDone?: boolean;
};

export type SharedList = {
  ownerUserId: string;
  ownerEmail: string;
  listId: string;
  createdAt: string;
  createdBy: string;
  permission?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type ListSharedWith = {
  email: string;
  listId: string;
  createdAt: string;
  createdBy: string;
  permission?: string;
  updatedAt?: string;
  updatedBy?: string;
  shouldRemove?: boolean;
  added?: boolean;
};

export type TodoList = {
  owner: string;
  createdAt: string;
  createdBy: string;
  listId: string;
  listName: string;
  items: TodoItem[];
  isArchived?: boolean;
  listAvatar?: string;
  orderBy?: string; // ListOrderType; // TODO define types
  sharedWith?: ListSharedWith[];
  updatedAt?: string;
  updatedBy?: string;
};

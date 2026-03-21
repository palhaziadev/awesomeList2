import { SharedList, TodoList } from './Todo';

export type User = {
  userId: string;
  googleUid?: string; // TODO check value and property name
  todoLists?: TodoList[];
  sharedLists?: SharedList[];
  email: string;
  profile: {
    userName: string;
    userPhoto: string;
  };
  createdAt: string;
  createdBy: string;
  permission?: string;
  updatedAt?: string;
  updatedBy?: string;
};

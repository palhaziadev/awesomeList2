# Edit Item Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an edit dialog that opens when a list item is pressed, allowing the user to view item details and edit translation override and shop assignment.

**Architecture:** Self-contained `EditItemDialog` component controlled from `[listId].tsx` via `selectedItem` state. Shop data loaded once per screen via a new `useShops` hook. `useTodoItems` gains an `updateItem` function that updates `todo_items.translation_override` and `todo_list_items.shop_id` with optimistic rollback.

**Tech Stack:** React Native + Expo Router, Supabase (PostgreSQL), Nativewind v4 (Tailwind), `@rn-primitives/dialog`, `@rn-primitives/dropdown-menu`, `@testing-library/react-native`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `models/Todo.ts` | Modify | Add `shopId` to `Item`; add `Shop` type |
| `utils/mappers.ts` | Modify | Map `translation_override` (via join) and `shop_id` (direct) |
| `hooks/useShops.ts` | Create | Fetch all shops from `todo_list_shop` |
| `hooks/useTodoItems.ts` | Modify | Extend select query; add `updateItem`; sync `shopId` in realtime handler |
| `components/EditItemDialog.tsx` | Create | Dialog UI: readonly fields, editable override, shop picker, Cancel/Save |
| `components/TodoItemRow.tsx` | Modify | Add `onPress` prop; wrap text area in `Pressable` |
| `app/list/[listId].tsx` | Modify | Add `selectedItem` state; render `EditItemDialog` |
| `__tests__/utils/mappers.test.ts` | Create | Unit tests for mapper new fields |
| `__tests__/hooks/useShops.test.ts` | Create | Unit tests for `useShops` |
| `__tests__/hooks/useTodoItems.updateItem.test.ts` | Create | Tests for `updateItem` |
| `__tests__/components/EditItemDialog.test.tsx` | Create | Component tests for dialog |
| `__tests__/components/TodoItemRow.test.tsx` | Create | Tests for `onPress` behaviour |

---

### Task 1: Data types and mapper

**Files:**
- Modify: `models/Todo.ts`
- Modify: `utils/mappers.ts`
- Create: `__tests__/utils/mappers.test.ts`

- [ ] **Step 1.1 — Write failing mapper tests**

Create `__tests__/utils/mappers.test.ts`:

```ts
import { mapRowToTodoItem } from '@/utils/mappers';

const baseRow = {
  id: 'list-item-1',
  item_id: 'item-1',
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  is_done: false,
};

describe('mapRowToTodoItem', () => {
  it('maps shop_id to shopId', () => {
    const result = mapRowToTodoItem({ ...baseRow, shop_id: 'shop-1' }, 'Apple');
    expect(result.shopId).toBe('shop-1');
  });

  it('sets shopId to undefined when shop_id is null', () => {
    const result = mapRowToTodoItem({ ...baseRow, shop_id: null }, 'Apple');
    expect(result.shopId).toBeUndefined();
  });

  it('sets shopId to undefined when shop_id is absent', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple');
    expect(result.shopId).toBeUndefined();
  });

  it('maps fourth argument to translationOverride', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple', 'Manzana', 'Manzana verde');
    expect(result.translationOverride).toBe('Manzana verde');
  });

  it('sets translationOverride to undefined when not provided', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple', 'Manzana');
    expect(result.translationOverride).toBeUndefined();
  });

  it('sets translationOverride to undefined when passed undefined', () => {
    const result = mapRowToTodoItem(baseRow, 'Apple', 'Manzana', undefined);
    expect(result.translationOverride).toBeUndefined();
  });
});
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="mappers" --no-coverage
```

Expected: FAIL — `shop_id` not in `TodoListItemRow` type, `shopId` not in return value.

- [ ] **Step 1.3 — Update `models/Todo.ts`**

Add `shopId` to `Item` and the new `Shop` type:

```ts
export type Item = {
  itemId: string;
  itemName: string;
  itemDescription?: string;
  translation?: string;
  translationOverride?: string;
  shopId?: string;           // ← add this line
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type TodoItem = Item & {
  id: string;
  isDone?: boolean;
};

// add at the end of the file, before or after existing types
export type Shop = {
  shopId: string;
  shopName: string;
};
```

Keep all other types (`SharedList`, `ListSharedWith`, `TodoList`) unchanged.

- [ ] **Step 1.4 — Update `utils/mappers.ts`**

```ts
import { TodoItem } from "@/models/Todo";

type TodoListItemRow = {
  id: string;
  item_id: string;
  created_at: string;
  created_by: string | null;
  is_done: boolean | null;
  shop_id?: string | null;
};

export function mapRowToTodoItem(
  row: TodoListItemRow,
  itemName: string,
  translation?: string,
  translationOverride?: string,
): TodoItem {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName,
    translation,
    translationOverride,
    shopId: row.shop_id ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? "",
    isDone: row.is_done ?? false,
  };
}
```

- [ ] **Step 1.5 — Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="mappers" --no-coverage
```

Expected: PASS (6 tests).

- [ ] **Step 1.6 — Commit**

```bash
git add models/Todo.ts utils/mappers.ts __tests__/utils/mappers.test.ts
git commit -m "feat: add shopId and Shop type; extend mapper for translationOverride and shopId"
```

---

### Task 2: useShops hook

**Files:**
- Create: `hooks/useShops.ts`
- Create: `__tests__/hooks/useShops.test.ts`

- [ ] **Step 2.1 — Write failing tests**

Create `__tests__/hooks/useShops.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useShops } from '@/hooks/useShops';
import { supabase } from '@/lib/supabase.config';

jest.mock('@/lib/supabase.config', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

describe('useShops', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with isLoading true', () => {
    const select = jest.fn().mockReturnValue(new Promise(() => {}));
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns mapped shops after fetch', async () => {
    const select = jest.fn().mockResolvedValue({
      data: [
        { id: 'shop-1', shop_name: 'Lidl' },
        { id: 'shop-2', shop_name: 'Aldi' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shops).toEqual([
      { shopId: 'shop-1', shopName: 'Lidl' },
      { shopId: 'shop-2', shopName: 'Aldi' },
    ]);
  });

  it('returns empty shops array on error', async () => {
    const select = jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shops).toEqual([]);
  });

  it('queries todo_list_shop table with id and shop_name', async () => {
    const select = jest.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ select });

    const { result } = renderHook(() => useShops());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('todo_list_shop');
    expect(select).toHaveBeenCalledWith('id, shop_name');
  });
});
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="useShops" --no-coverage
```

Expected: FAIL — module `@/hooks/useShops` not found.

- [ ] **Step 2.3 — Create `hooks/useShops.ts`**

```ts
import { supabase } from "@/lib/supabase.config";
import { Shop } from "@/models/Todo";
import * as React from "react";

export function useShops() {
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchShops() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("todo_list_shop")
        .select("id, shop_name");
      setIsLoading(false);
      if (error || !data) return;
      setShops(data.map((row) => ({ shopId: String(row.id), shopName: row.shop_name })));
    }
    fetchShops();
  }, []);

  return { shops, isLoading };
}
```

- [ ] **Step 2.4 — Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="useShops" --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 2.5 — Commit**

```bash
git add hooks/useShops.ts __tests__/hooks/useShops.test.ts
git commit -m "feat: add useShops hook"
```

---

### Task 3: Extend useTodoItems — fetch query, updateItem, realtime sync

**Files:**
- Modify: `hooks/useTodoItems.ts`
- Create: `__tests__/hooks/useTodoItems.updateItem.test.ts`

- [ ] **Step 3.1 — Write failing tests for updateItem**

Create `__tests__/hooks/useTodoItems.updateItem.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTodoItems } from '@/hooks/useTodoItems';
import { supabase } from '@/lib/supabase.config';

jest.mock('@/lib/supabase.config', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
    realtime: { setAuth: jest.fn().mockResolvedValue(undefined) },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: jest.fn((cb: () => () => void) => {
      React.useEffect(cb, []);
    }),
  };
});

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

const sampleRow = {
  id: 'list-item-1',
  item_id: 'todo-item-1',
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  is_done: false,
  shop_id: null,
  todo_items: { name: 'Apple', translation: 'Manzana', translation_override: null },
};

function buildFromMock(
  fetchData: typeof sampleRow[],
  updateTodoItemsResult = { error: null },
  updateListItemsResult = { error: null },
) {
  const eqFetch = jest.fn().mockResolvedValue({ data: fetchData, error: null });
  const selectFetch = jest.fn().mockReturnValue({ eq: eqFetch });

  const eqUpdateTodoItems = jest.fn().mockResolvedValue(updateTodoItemsResult);
  const updateTodoItems = jest.fn().mockReturnValue({ eq: eqUpdateTodoItems });

  const eqUpdateListItems = jest.fn().mockResolvedValue(updateListItemsResult);
  const updateListItems = jest.fn().mockReturnValue({ eq: eqUpdateListItems });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'todo_list_items') return { select: selectFetch, update: updateListItems };
    if (table === 'todo_items') return { update: updateTodoItems };
    return {};
  });

  return { eqFetch, selectFetch, updateTodoItems, eqUpdateTodoItems, updateListItems, eqUpdateListItems };
}

describe('useTodoItems — updateItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('optimistically updates translationOverride and shopId in state', async () => {
    const { } = buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: 'Manzana verde',
        shopId: 'shop-1',
      });
    });

    expect(result.current.items[0].translationOverride).toBe('Manzana verde');
    expect(result.current.items[0].shopId).toBe('shop-1');
  });

  it('updates todo_items.translation_override with item_id', async () => {
    const { updateTodoItems, eqUpdateTodoItems } = buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: 'override',
        shopId: null,
      });
    });

    expect(updateTodoItems).toHaveBeenCalledWith({ translation_override: 'override' });
    expect(eqUpdateTodoItems).toHaveBeenCalledWith('id', 'todo-item-1');
  });

  it('updates todo_list_items.shop_id with list item id', async () => {
    const { updateListItems, eqUpdateListItems } = buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: null,
        shopId: 'shop-2',
      });
    });

    expect(updateListItems).toHaveBeenCalledWith({ shop_id: 'shop-2' });
    expect(eqUpdateListItems).toHaveBeenCalledWith('id', 'list-item-1');
  });

  it('rolls back state and shows alert on error', async () => {
    buildFromMock([sampleRow], { error: { message: 'fail' } });
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem('list-item-1', {
        translationOverride: 'bad',
        shopId: null,
      });
    });

    expect(result.current.items[0].translationOverride).toBeUndefined();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update item. Please try again.');
  });

  it('returns false when item id not found', async () => {
    buildFromMock([sampleRow]);
    const { result } = renderHook(() => useTodoItems('list-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.updateItem('nonexistent', {
        translationOverride: null,
        shopId: null,
      });
    });

    expect(returnValue).toBe(false);
  });
});
```

- [ ] **Step 3.2 — Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="useTodoItems.updateItem" --no-coverage
```

Expected: FAIL — `updateItem` not in hook return value.

- [ ] **Step 3.3 — Update `hooks/useTodoItems.ts`**

Make three changes:

**a) Extend the fetch select query** (line ~19):
```ts
const { data, error } = await supabase
  .from("todo_list_items")
  .select("*, todo_items(name, translation, translation_override)")
  .eq("list_id", listId);
```

**b) Pass `translationOverride` to mapper** (line ~29):
```ts
setItems(
  (data ?? []).map((row) =>
    mapRowToTodoItem(
      row,
      row.todo_items?.name ?? "",
      row.todo_items?.translation ?? undefined,
      row.todo_items?.translation_override ?? undefined,
    ),
  ),
);
```

**c) Add `shopId` sync to the UPDATE broadcast handler** (in `setupBroadcast`, the `.on("broadcast", { event: "UPDATE" })` callback):
```ts
.on("broadcast", { event: "UPDATE" }, ({ payload }) => {
  const record = payload.record;
  setItems((prev) =>
    prev.map((item) =>
      item.id === record.id
        ? {
            ...item,
            isDone: record.is_done ?? item.isDone,
            shopId: record.shop_id ?? undefined,
          }
        : item,
    ),
  );
})
```

**d) Add `updateItem` function** (after the `toggleDone` function, before the return statement):
```ts
async function updateItem(
  id: string,
  patch: { translationOverride: string | null; shopId: string | null },
): Promise<boolean> {
  const item = items.find((i) => i.id === id);
  if (!item) return false;

  const previous = items;
  setItems((prev) =>
    prev.map((i) =>
      i.id === id
        ? {
            ...i,
            translationOverride: patch.translationOverride ?? undefined,
            shopId: patch.shopId ?? undefined,
          }
        : i,
    ),
  );

  const [itemsResult, listItemsResult] = await Promise.all([
    supabase
      .from("todo_items")
      .update({ translation_override: patch.translationOverride })
      .eq("id", item.itemId),
    supabase
      .from("todo_list_items")
      .update({ shop_id: patch.shopId })
      .eq("id", id),
  ]);

  if (itemsResult.error || listItemsResult.error) {
    setItems(previous);
    Alert.alert("Error", "Failed to update item. Please try again.");
    return false;
  }

  return true;
}
```

**e) Add `updateItem` to the return statement**:
```ts
return { items, isLoading, isSaving, addItem, removeItem, toggleDone, updateItem };
```

- [ ] **Step 3.4 — Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="useTodoItems.updateItem" --no-coverage
```

Expected: PASS (5 tests).

- [ ] **Step 3.5 — Run all existing tests to confirm no regressions**

```bash
npm run test -- --no-coverage
```

Expected: all previously passing tests still pass.

- [ ] **Step 3.6 — Commit**

```bash
git add hooks/useTodoItems.ts __tests__/hooks/useTodoItems.updateItem.test.ts
git commit -m "feat: extend useTodoItems with updateItem, translationOverride fetch, shopId realtime sync"
```

---

### Task 4: EditItemDialog component

**Files:**
- Create: `components/EditItemDialog.tsx`
- Create: `__tests__/components/EditItemDialog.test.tsx`

- [ ] **Step 4.1 — Write failing tests**

Create `__tests__/components/EditItemDialog.test.tsx`:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { EditItemDialog } from '@/components/EditItemDialog';
import { Shop, TodoItem } from '@/models/Todo';

jest.mock('@/components/ui/dialog', () => {
  const React = require('react');
  const { View, Text: RNText } = require('react-native');
  return {
    Dialog: ({ children, open }: any) =>
      open ? React.createElement(View, { testID: 'dialog' }, children) : null,
    DialogContent: ({ children }: any) => React.createElement(View, null, children),
    DialogHeader: ({ children }: any) => React.createElement(View, null, children),
    DialogTitle: ({ children }: any) => React.createElement(RNText, null, children),
    DialogFooter: ({ children }: any) => React.createElement(View, null, children),
  };
});

jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    DropdownMenu: ({ children }: any) => React.createElement(View, null, children),
    DropdownMenuTrigger: ({ children }: any) => React.createElement(View, null, children),
    DropdownMenuContent: ({ children }: any) => React.createElement(View, { testID: 'shop-options' }, children),
    DropdownMenuItem: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress }, children),
  };
});

const sampleItem: TodoItem = {
  id: 'list-item-1',
  itemId: 'item-1',
  itemName: 'Apple',
  translation: 'Manzana',
  translationOverride: undefined,
  shopId: undefined,
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  isDone: false,
};

const sampleShops: Shop[] = [
  { shopId: 'shop-1', shopName: 'Lidl' },
  { shopId: 'shop-2', shopName: 'Aldi' },
];

describe('EditItemDialog', () => {
  it('does not render when item is null', () => {
    const { queryByTestId } = render(
      <EditItemDialog item={null} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(queryByTestId('dialog')).toBeNull();
  });

  it('renders when item is provided', () => {
    const { getByTestId } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByTestId('dialog')).toBeTruthy();
  });

  it('shows item name', () => {
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('Apple')).toBeTruthy();
  });

  it('shows translation', () => {
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('Manzana')).toBeTruthy();
  });

  it('shows existing translationOverride in input', () => {
    const item = { ...sampleItem, translationOverride: 'Manzana verde' };
    const { getByDisplayValue } = render(
      <EditItemDialog item={item} shops={[]} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByDisplayValue('Manzana verde')).toBeTruthy();
  });

  it('Cancel button calls onClose without saving', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={onSave} onClose={onClose} />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save button calls onSave with current values then onClose', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={onSave} onClose={onClose} />,
    );
    fireEvent.changeText(getByPlaceholderText('Override translation...'), 'Custom');
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: 'Custom', shopId: null });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Save coerces empty override text to null', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={[]} onSave={onSave} onClose={jest.fn()} />,
    );
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: null, shopId: null });
  });

  it('renders shop options', () => {
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={sampleShops} onSave={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('Lidl')).toBeTruthy();
    expect(getByText('Aldi')).toBeTruthy();
  });

  it('selecting a shop updates selectedShopId passed to Save', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <EditItemDialog item={sampleItem} shops={sampleShops} onSave={onSave} onClose={jest.fn()} />,
    );
    fireEvent.press(getByText('Lidl'));
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: null, shopId: 'shop-1' });
  });

  it('selecting None sets shopId to null', () => {
    const onSave = jest.fn();
    const item = { ...sampleItem, shopId: 'shop-1' };
    const { getByText, getAllByText } = render(
      <EditItemDialog item={item} shops={sampleShops} onSave={onSave} onClose={jest.fn()} />,
    );
    fireEvent.press(getAllByText('None')[0]);
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ translationOverride: null, shopId: null });
  });

  it('resets state when item changes', async () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, rerender } = render(
      <EditItemDialog
        item={{ ...sampleItem, translationOverride: 'First' }}
        shops={[]}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );
    expect(getByPlaceholderText('Override translation...').props.value).toBe('First');

    rerender(
      <EditItemDialog
        item={{ ...sampleItem, translationOverride: 'Second' }}
        shops={[]}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(getByPlaceholderText('Override translation...').props.value).toBe('Second');
    });
  });
});
```

- [ ] **Step 4.2 — Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="EditItemDialog" --no-coverage
```

Expected: FAIL — module `@/components/EditItemDialog` not found.

- [ ] **Step 4.3 — Create `components/EditItemDialog.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Shop, TodoItem } from "@/models/Todo";
import * as React from "react";
import { View } from "react-native";

type Props = {
  item: TodoItem | null;
  shops: Shop[];
  onSave: (patch: { translationOverride: string | null; shopId: string | null }) => void;
  onClose: () => void;
};

export function EditItemDialog({ item, shops, onSave, onClose }: Props) {
  const [overrideText, setOverrideText] = React.useState(
    item?.translationOverride ?? "",
  );
  const [selectedShopId, setSelectedShopId] = React.useState<string | null>(
    item?.shopId ?? null,
  );

  React.useEffect(() => {
    setOverrideText(item?.translationOverride ?? "");
    setSelectedShopId(item?.shopId ?? null);
  }, [item]);

  const selectedShop = shops.find((s) => s.shopId === selectedShopId);

  function handleSave() {
    onSave({
      translationOverride: overrideText.trim() || null,
      shopId: selectedShopId,
    });
    onClose();
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <View className="gap-1">
          <Text className="text-xs text-muted-foreground uppercase tracking-wide">Name</Text>
          <View className="rounded-md border border-border bg-muted px-3 py-2">
            <Text className="text-sm text-muted-foreground">{item?.itemName}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-muted-foreground uppercase tracking-wide">Translation</Text>
          <View className="rounded-md border border-border bg-muted px-3 py-2">
            <Text className="text-sm text-muted-foreground">{item?.translation ?? "—"}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-foreground uppercase tracking-wide">Translation Override</Text>
          <Input
            value={overrideText}
            onChangeText={setOverrideText}
            placeholder="Override translation..."
          />
        </View>

        <View className="gap-1">
          <Text className="text-xs text-foreground uppercase tracking-wide">Shop</Text>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between">
                <Text>{selectedShop?.shopName ?? "None"}</Text>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onPress={() => setSelectedShopId(null)}>
                <Text>None</Text>
              </DropdownMenuItem>
              {shops.map((shop) => (
                <DropdownMenuItem
                  key={shop.shopId}
                  onPress={() => setSelectedShopId(shop.shopId)}
                >
                  <Text>{shop.shopName}</Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSave}>
            <Text>Save</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4.4 — Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="EditItemDialog" --no-coverage
```

Expected: PASS (11 tests).

- [ ] **Step 4.5 — Commit**

```bash
git add components/EditItemDialog.tsx __tests__/components/EditItemDialog.test.tsx
git commit -m "feat: add EditItemDialog component"
```

---

### Task 5: TodoItemRow — add onPress

**Files:**
- Modify: `components/TodoItemRow.tsx`
- Create: `__tests__/components/TodoItemRow.test.tsx`

- [ ] **Step 5.1 — Write failing tests**

Create `__tests__/components/TodoItemRow.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import * as React from 'react';
import { TodoItemRow } from '@/components/TodoItemRow';
import { TodoItem } from '@/models/Todo';

const sampleItem: TodoItem = {
  id: 'list-item-1',
  itemId: 'item-1',
  itemName: 'Apple',
  translation: 'Manzana',
  translationOverride: undefined,
  shopId: undefined,
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  isDone: false,
};

describe('TodoItemRow', () => {
  it('calls onPress when the text area is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TodoItemRow
        item={sampleItem}
        onRemove={jest.fn()}
        onToggleDone={jest.fn()}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByText('Apple'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when remove button is pressed', () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    const { getAllByRole } = render(
      <TodoItemRow
        item={sampleItem}
        onRemove={onRemove}
        onToggleDone={jest.fn()}
        onPress={onPress}
      />,
    );
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[buttons.length - 1]);
    expect(onPress).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith('list-item-1');
  });

  it('shows translationOverride instead of translation when defined', () => {
    const item = { ...sampleItem, translationOverride: 'Manzana verde' };
    const { getByText, queryByText } = render(
      <TodoItemRow item={item} onRemove={jest.fn()} onToggleDone={jest.fn()} onPress={jest.fn()} />,
    );
    expect(getByText('Manzana verde')).toBeTruthy();
    expect(queryByText('Manzana')).toBeNull();
  });

  it('shows translation when translationOverride is undefined', () => {
    const { getByText } = render(
      <TodoItemRow item={sampleItem} onRemove={jest.fn()} onToggleDone={jest.fn()} onPress={jest.fn()} />,
    );
    expect(getByText('Manzana')).toBeTruthy();
  });
});
```

- [ ] **Step 5.2 — Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="TodoItemRow" --no-coverage
```

Expected: FAIL — `onPress` prop not accepted.

- [ ] **Step 5.3 — Update `components/TodoItemRow.tsx`**

Full updated file:

```tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { TodoItem } from "@/models/Todo";
import { X } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, {
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";

type Props = {
  item: TodoItem;
  onRemove: (id: string) => void;
  onToggleDone: (id: string, isDone: boolean) => void;
  onPress: () => void;
};

export function TodoItemRow({ item, onRemove, onToggleDone, onPress }: Props) {
  const displayTranslation = item.translationOverride ?? item.translation;
  return (
    <Animated.View
      entering={SlideInLeft.delay(300)}
      exiting={SlideOutRight}
      layout={LinearTransition}
    >
      <View className="flex-row items-center border border-border rounded-md p-3 bg-background gap-3">
        <Checkbox
          checked={item.isDone ?? false}
          onCheckedChange={(checked) => onToggleDone(item.id, !!checked)}
        />
        <Pressable className="flex-1" onPress={onPress}>
          <Text
            className={cn(
              "text-sm font-medium",
              item.isDone && "line-through text-muted-foreground",
            )}
          >
            {item.itemName}
          </Text>
          {displayTranslation ? (
            <Text className="text-xs text-muted-foreground">
              {displayTranslation}
            </Text>
          ) : null}
        </Pressable>
        <Button variant="ghost" size="icon" onPress={() => onRemove(item.id)}>
          <X size={16} className="text-muted-foreground" />
        </Button>
      </View>
    </Animated.View>
  );
}
```

- [ ] **Step 5.4 — Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="TodoItemRow" --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 5.5 — Run all tests to check no regressions**

```bash
npm run test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5.6 — Commit**

```bash
git add components/TodoItemRow.tsx __tests__/components/TodoItemRow.test.tsx
git commit -m "feat: add onPress to TodoItemRow text area"
```

---

### Task 6: Wire up in [listId].tsx

**Files:**
- Modify: `app/list/[listId].tsx`

No new test file for this task — `EditItemDialog` and `useTodoItems` are already covered. The change is wiring.

- [ ] **Step 6.1 — Update `app/list/[listId].tsx`**

Full updated file:

```tsx
import { EditItemDialog } from "@/components/EditItemDialog";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TodoItemRow } from "@/components/TodoItemRow";
import { Button } from "@/components/ui/button";
import { ItemListFilter } from "@/components/ItemListFilter";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useShops } from "@/hooks/useShops";
import { useTodoItems } from "@/hooks/useTodoItems";
import { TodoItem } from "@/models/Todo";
import { useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListScreen() {
  const { listId, listName } = useLocalSearchParams<{
    listId: string;
    listName: string;
  }>();

  const { items, isLoading, isSaving, addItem, removeItem, toggleDone, updateItem } =
    useTodoItems(listId);
  const { shops } = useShops();
  const [selectedItem, setSelectedItem] = React.useState<TodoItem | null>(null);
  const [inputText, setInputText] = React.useState("");
  const [grouping, setGrouping] = React.useState(true);
  const [dateOrder, setDateOrder] = React.useState<"asc" | "desc" | null>("desc");
  const [alphaOrder, setAlphaOrder] = React.useState<"asc" | "desc" | null>(null);

  const sortedItems = React.useMemo(() => {
    let result = [...items];
    if (dateOrder) {
      result.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return dateOrder === "asc" ? diff : -diff;
      });
    }
    if (alphaOrder) {
      result.sort((a, b) => {
        const cmp = a.itemName.localeCompare(b.itemName);
        return alphaOrder === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [items, dateOrder, alphaOrder]);

  const pendingItems = React.useMemo(() => sortedItems.filter((i) => !i.isDone), [sortedItems]);
  const doneItems = React.useMemo(() => sortedItems.filter((i) => i.isDone), [sortedItems]);

  async function handleAdd() {
    const success = await addItem(inputText);
    if (success) setInputText("");
  }

  return (
    <SafeAreaView className="flex-1 p-4 gap-3">
      <ScreenHeader title={listName} />
      <View className="flex-row gap-2">
        <Input
          className="flex-1"
          placeholder="New item..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => inputText.trim() && handleAdd()}
          returnKeyType="done"
        />
        <Button disabled={!inputText.trim() || isSaving} onPress={handleAdd}>
          <Text>Add</Text>
        </Button>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">Grouping</Text>
        <View className="flex-row items-center gap-3">
          <Switch checked={grouping} onCheckedChange={setGrouping} />
          <ItemListFilter
            dateOrder={dateOrder}
            onDateOrderChange={(order) => { setAlphaOrder(null); setDateOrder(order); }}
            alphaOrder={alphaOrder}
            onAlphaOrderChange={(order) => { setDateOrder(null); setAlphaOrder(order); }}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {isLoading && <ActivityIndicator className="mt-4" />}
        {grouping ? (
          <>
            {pendingItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
            {pendingItems.length > 0 && doneItems.length > 0 && (
              <View className="flex-row items-center gap-2 my-1">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-xs text-muted-foreground">Done</Text>
                <View className="flex-1 h-px bg-border" />
              </View>
            )}
            {doneItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
          </>
        ) : (
          sortedItems.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onRemove={removeItem}
              onToggleDone={toggleDone}
              onPress={() => setSelectedItem(item)}
            />
          ))
        )}
      </ScrollView>
      <EditItemDialog
        item={selectedItem}
        shops={shops}
        onSave={(patch) => {
          if (selectedItem) updateItem(selectedItem.id, patch);
          setSelectedItem(null);
        }}
        onClose={() => setSelectedItem(null)}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 6.2 — Run all tests to confirm everything passes**

```bash
npm run test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6.3 — Commit**

```bash
git add app/list/[listId].tsx
git commit -m "feat: wire up EditItemDialog in list screen"
```

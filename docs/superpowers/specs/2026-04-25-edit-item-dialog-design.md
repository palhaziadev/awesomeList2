# Edit Item Dialog — Design Spec

Date: 2026-04-25

## Overview

When a user presses a list item row, a dialog opens to view and edit that item's details. Read-only fields show the item name and its auto-translation. Editable fields allow the user to override the translation and assign a shop. Saving persists changes to Supabase; cancelling or pressing outside discards them.

---

## Data Model Changes

### `models/Todo.ts`

- Add `shopId?: string` to the `Item` type.
- Add new `Shop` type:

```ts
export type Shop = {
  shopId: string;
  shopName: string;
};
```

### `utils/mappers.ts`

`mapRowToTodoItem` maps two new fields from the `todo_list_items` DB row:

| DB column | Model field |
|---|---|
| `translation_override` | `translationOverride` |
| `shop_id` | `shopId` |

The `TodoListItemRow` type in the mapper also needs these two new optional fields.

### `useTodoItems` fetch query

Extend the `.select()` call to include `translation_override` and `shop_id` from `todo_list_items`.

---

## New Hook: `hooks/useShops.ts`

Fetches all shops from `todo_list_shop` on mount.

```ts
const { data } = await supabase.from("todo_list_shop").select("id, shop_name");
// maps: id → shopId, shop_name → shopName
```

Returns `{ shops: Shop[], isLoading: boolean }`.

---

## Extended Hook: `useTodoItems` — `updateItem`

New function added to the hook's return value:

```ts
updateItem(id: string, patch: { translationOverride?: string | null; shopId?: string | null }) => Promise<boolean>
```

- Updates `todo_items.translation_override` using the `item_id` from the list item row.
- Updates `todo_list_items.shop_id` on the row with the given `id`.
- Applies optimistic update to local state; rolls back on error.

The realtime `UPDATE` broadcast handler in `useTodoItems` currently only syncs `isDone`. It must also sync `translationOverride` and `shopId` from the broadcast payload so other users see edits in real time.

---

## New Component: `components/EditItemDialog.tsx`

### Props

```ts
type Props = {
  item: TodoItem | null;
  shops: Shop[];
  onSave: (patch: { translationOverride: string | null; shopId: string | null }) => void;
  onClose: () => void;
};
```

### Local state

- `overrideText: string` — initialised from `item.translationOverride ?? ""`
- `selectedShopId: string | null` — initialised from `item.shopId ?? null`
- Both reset via `useEffect` when `item` changes.

### Layout (Option A — stacked form)

```
[ Edit Item ]                              [✕]

Label: Name
Value: {item.itemName}  (read-only, muted bg)

Label: Translation
Value: {item.translation}  (read-only, muted bg)

Label: Translation Override
Input: editable, shows overrideText

Label: Shop
DropdownMenu: shows shop name or "None"
  - First option: "None" → sets selectedShopId to null
  - Then one option per shop

[ Cancel ]  [ Save ]
```

### Behaviour

| Action | Result |
|---|---|
| Press outside (overlay) | `onClose()` — no save |
| Press ✕ button | `onClose()` — no save |
| Press Cancel | `onClose()` — no save |
| Press Save | `onSave({ translationOverride: overrideText \|\| null, shopId: selectedShopId })` then `onClose()` |

Empty `overrideText` is coerced to `null` before saving to keep the DB clean.

`open` prop is derived from `item !== null`.

---

## Updated Component: `components/TodoItemRow.tsx`

### Changes

- Add `onPress: () => void` to `Props`.
- Wrap the existing `View className="flex-1"` (name + translation text) in a `Pressable` that calls `onPress`.
- The `Checkbox` and delete `Button` remain outside the `Pressable` — no change to their behaviour.
- `displayTranslation = item.translationOverride ?? item.translation` is already in place — no change needed.

---

## Updated Screen: `app/list/[listId].tsx`

### Changes

- Add `const [selectedItem, setSelectedItem] = React.useState<TodoItem | null>(null)`
- Add `const { shops } = useShops()`
- Destructure `updateItem` from `useTodoItems`
- Pass `onPress={() => setSelectedItem(item)}` to each `TodoItemRow`
- Render `EditItemDialog` once at the bottom of the screen:

```tsx
<EditItemDialog
  item={selectedItem}
  shops={shops}
  onSave={(patch) => {
    if (selectedItem) updateItem(selectedItem.id, patch);
    setSelectedItem(null);
  }}
  onClose={() => setSelectedItem(null)}
/>
```

---

## Files Touched

| File | Change |
|---|---|
| `models/Todo.ts` | Add `shopId` to `Item`; add `Shop` type |
| `utils/mappers.ts` | Map `translation_override`, `shop_id` |
| `hooks/useTodoItems.ts` | Extend select query; add `updateItem` |
| `hooks/useShops.ts` | New hook |
| `components/EditItemDialog.tsx` | New component |
| `components/TodoItemRow.tsx` | Add `onPress`; wrap text area in Pressable |
| `app/list/[listId].tsx` | Add `selectedItem` state; wire up dialog |

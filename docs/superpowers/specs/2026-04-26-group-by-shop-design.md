# Group by Shop — Design Spec

**Date:** 2026-04-26

## Overview

Add a "Group by shop" toggle to `ItemListFilter`. When active, list items are rendered in named shop sections so items assigned to the same shop appear together. Items with no shop assigned appear at the bottom under an "Other" section. Done items are grouped by shop separately (below the pending section, when the existing "Grouping" switch is on).

---

## Components

### `ItemListFilter` (`components/ItemListFilter.tsx`)

**New props:**

```ts
groupByShop?: boolean;
onGroupByShopChange?: (value: boolean) => void;
```

**UI change:**

A new section is added at the top of the popover content, above "Order by Date":

- Label: `"Group by Shop"` (same style as existing section labels — `text-xs font-semibold text-muted-foreground uppercase tracking-wide`)
- Control: a single full-width `Toggle` using the existing `Toggle` primitive. `pressed={groupByShop}`, `onPressedChange` calls `onGroupByShopChange` with the toggled value.

No new components are introduced.

---

### `app/list/[listId].tsx`

**New state:**

```ts
const [groupByShop, setGroupByShop] = React.useState(false);
```

**New memo — `shopGroups`:**

Computed when `groupByShop` is `true`. Takes a sorted item array and returns:

```ts
type ShopGroup = { shopId: string | null; shopName: string; items: TodoItem[] };
```

- Items are bucketed by `shopId`.
- Named shop groups appear first, ordered by first occurrence in the sorted array.
- `shopId` is resolved to `shopName` using the `shops` array already in scope from `useShops()`.
- Items with no `shopId` (or a `shopId` not found in `shops`) go into a final `{ shopId: null, shopName: "Other" }` group. This group is omitted entirely if it would be empty.

**`ItemListFilter` receives two new props:**

```tsx
groupByShop={groupByShop}
onGroupByShopChange={setGroupByShop}
```

**Rendering:**

When `groupByShop` is `false` — existing behavior unchanged.

When `groupByShop` is `true`:

- The `shopGroups` memo is computed for `pendingItems` and (when "Grouping" switch is on) `doneItems` independently.
- Each group renders a shop name header followed by its `TodoItemRow` items.
- Shop name header style: same as the existing "Done" divider (`text-xs text-muted-foreground`), but left-aligned as a plain label row — no horizontal rules.
- The existing pending/done divider (`── Done ──`) is preserved between the two sets of shop groups when the "Grouping" switch is on.
- When "Grouping" switch is off, all items are passed to `shopGroups` as a single array (no done/pending split).

---

## Data Flow

```
useShops() → shops[]
useTodoItems() → items[]
  → sortedItems (date/alpha sort, existing memo)
    → pendingItems / doneItems (existing memos)
      → shopGroups(pendingItems) / shopGroups(doneItems)  [new, only when groupByShop]
        → rendered shop sections with headers
```

---

## Edge Cases

| Case | Behaviour |
|---|---|
| Item has no `shopId` | Placed in "Other" group at the bottom of its section |
| Item has a `shopId` not present in `shops` | Treated as no shop → "Other" |
| All items have no shop | Single "Other" group with no named groups above it |
| All items have a shop | No "Other" group rendered |
| `groupByShop` off | Existing behaviour, no change |
| "Grouping" switch off + `groupByShop` on | All items (pending and done) grouped by shop together, no done divider |

---

## Testing

- Existing `ItemListFilter` tests: add cases for `groupByShop` prop rendering and toggle interaction.
- `[listId].tsx` unit/integration tests: verify `shopGroups` memo output for mixed/no-shop/all-shop item sets.
- No changes to `useTodoItems` or `useShops` — no hook tests affected.

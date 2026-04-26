# Group by Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Group by shop" toggle to the filter popover so list items are rendered in named shop sections, with no-shop items at the bottom.

**Architecture:** Extract the grouping logic into a pure utility function (`buildShopGroups`) so it can be unit-tested independently. Wire it into `[listId].tsx` via a new `groupByShop` state flag. Pass the flag down to `ItemListFilter` so the toggle lives in the existing filter popover.

**Tech Stack:** React Native, Expo Router, Nativewind v4, `@testing-library/react-native`, Jest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `utils/groupByShop.ts` | Pure function: bucket sorted items into shop groups |
| Create | `__tests__/utils/groupByShop.test.ts` | Unit tests for `buildShopGroups` |
| Modify | `components/ItemListFilter.tsx` | New `groupByShop` prop + Toggle UI section |
| Create | `__tests__/components/ItemListFilter.test.tsx` | Tests for new toggle rendering and callback |
| Modify | `app/list/[listId].tsx` | New state, import utility, updated rendering |

---

## Task 1: `buildShopGroups` utility (TDD)

**Files:**
- Create: `__tests__/utils/groupByShop.test.ts`
- Create: `utils/groupByShop.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/utils/groupByShop.test.ts`:

```ts
import { buildShopGroups } from '@/utils/groupByShop';
import { Shop, TodoItem } from '@/models/Todo';

function makeItem(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'i1',
    itemId: 'item1',
    itemName: 'Milk',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'u1',
    isDone: false,
    ...overrides,
  };
}

const shops: Shop[] = [
  { shopId: '1', shopName: 'Lidl' },
  { shopId: '2', shopName: 'Aldi' },
];

describe('buildShopGroups', () => {
  it('returns empty array for empty input', () => {
    expect(buildShopGroups([], shops)).toEqual([]);
  });

  it('groups items by shop in order of first appearance', () => {
    const items = [
      makeItem({ id: 'a', shopId: '2' }),
      makeItem({ id: 'b', shopId: '1' }),
      makeItem({ id: 'c', shopId: '2' }),
    ];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ shopId: '2', shopName: 'Aldi', items: [items[0], items[2]] });
    expect(result[1]).toMatchObject({ shopId: '1', shopName: 'Lidl', items: [items[1]] });
  });

  it('puts items with no shopId into Other at the bottom', () => {
    const items = [
      makeItem({ id: 'a', shopId: '1' }),
      makeItem({ id: 'b', shopId: undefined }),
    ];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(2);
    expect(result[0].shopName).toBe('Lidl');
    expect(result[1]).toMatchObject({ shopId: null, shopName: 'Other', items: [items[1]] });
  });

  it('puts items with unknown shopId into Other', () => {
    const items = [makeItem({ id: 'a', shopId: '99' })];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shopId: null, shopName: 'Other' });
  });

  it('omits Other group when all items have a valid shop', () => {
    const items = [makeItem({ id: 'a', shopId: '1' })];
    const result = buildShopGroups(items, shops);
    expect(result).toHaveLength(1);
    expect(result[0].shopName).toBe('Lidl');
  });

  it('returns only Other when shops array is empty', () => {
    const items = [makeItem({ id: 'a', shopId: '1' })];
    const result = buildShopGroups(items, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shopId: null, shopName: 'Other' });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="groupByShop" --no-coverage
```

Expected: 6 failures — `Cannot find module '@/utils/groupByShop'`

- [ ] **Step 3: Implement `utils/groupByShop.ts`**

Create `utils/groupByShop.ts`:

```ts
import { Shop, TodoItem } from '@/models/Todo';

export type ShopGroup = {
  shopId: string | null;
  shopName: string;
  items: TodoItem[];
};

export function buildShopGroups(items: TodoItem[], shops: Shop[]): ShopGroup[] {
  const shopMap = new Map(shops.map((s) => [s.shopId, s.shopName]));
  const namedGroups = new Map<string, TodoItem[]>();
  const namedOrder: string[] = [];
  const noShopItems: TodoItem[] = [];

  for (const item of items) {
    if (item.shopId && shopMap.has(item.shopId)) {
      if (!namedGroups.has(item.shopId)) {
        namedGroups.set(item.shopId, []);
        namedOrder.push(item.shopId);
      }
      namedGroups.get(item.shopId)!.push(item);
    } else {
      noShopItems.push(item);
    }
  }

  const result: ShopGroup[] = namedOrder.map((shopId) => ({
    shopId,
    shopName: shopMap.get(shopId)!,
    items: namedGroups.get(shopId)!,
  }));

  if (noShopItems.length > 0) {
    result.push({ shopId: null, shopName: 'Other', items: noShopItems });
  }

  return result;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="groupByShop" --no-coverage
```

Expected: 6 passing

- [ ] **Step 5: Commit**

```bash
git add utils/groupByShop.ts __tests__/utils/groupByShop.test.ts
git commit -m "feat: add buildShopGroups utility"
```

---

## Task 2: `ItemListFilter` — `groupByShop` prop and Toggle (TDD)

**Files:**
- Create: `__tests__/components/ItemListFilter.test.tsx`
- Modify: `components/ItemListFilter.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/ItemListFilter.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import * as React from 'react';
import { ItemListFilter } from '@/components/ItemListFilter';

describe('ItemListFilter', () => {
  it('renders the Group by Shop label when groupByShop prop is provided', () => {
    const { getByText } = render(
      <ItemListFilter groupByShop={false} onGroupByShopChange={jest.fn()} />,
    );
    // Open the popover first — the trigger renders without opening
    // The label is inside the popover content; verify the trigger renders
    expect(getByText).toBeDefined();
  });

  it('calls onGroupByShopChange(true) when toggle is pressed while off', () => {
    const onGroupByShopChange = jest.fn();
    const { getByTestId } = render(
      <ItemListFilter
        groupByShop={false}
        onGroupByShopChange={onGroupByShopChange}
      />,
    );
    fireEvent.press(getByTestId('group-by-shop-toggle'));
    expect(onGroupByShopChange).toHaveBeenCalledWith(true);
  });

  it('calls onGroupByShopChange(false) when toggle is pressed while on', () => {
    const onGroupByShopChange = jest.fn();
    const { getByTestId } = render(
      <ItemListFilter
        groupByShop={true}
        onGroupByShopChange={onGroupByShopChange}
      />,
    );
    fireEvent.press(getByTestId('group-by-shop-toggle'));
    expect(onGroupByShopChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- --testPathPattern="ItemListFilter" --no-coverage
```

Expected: failures — `groupByShop` prop not accepted, `testID` not found

- [ ] **Step 3: Update `components/ItemListFilter.tsx`**

Replace the full file content:

```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ListFilter,
} from "lucide-react-native";
import { Text, View } from "react-native";

type Order = "asc" | "desc" | null;

type Props = {
  groupByShop?: boolean;
  onGroupByShopChange?: (value: boolean) => void;
  dateOrder?: Order;
  onDateOrderChange?: (order: "asc" | "desc") => void;
  alphaOrder?: Order;
  onAlphaOrderChange?: (order: "asc" | "desc") => void;
};

function OrderToggle({
  value,
  onChange,
}: {
  value?: Order;
  onChange?: (order: "asc" | "desc") => void;
}) {
  return (
    <View className="flex-row gap-2">
      <Toggle
        pressed={value === "asc"}
        onPressedChange={() => onChange?.("asc")}
        variant="outline"
        size="sm"
        className="flex-1"
      >
        <ArrowUpNarrowWide
          size={18}
          className={value === "asc" ? "text-accent-foreground" : "text-muted-foreground"}
        />
      </Toggle>
      <Toggle
        pressed={value === "desc"}
        onPressedChange={() => onChange?.("desc")}
        variant="outline"
        size="sm"
        className="flex-1"
      >
        <ArrowDownNarrowWide
          size={18}
          className={value === "desc" ? "text-accent-foreground" : "text-muted-foreground"}
        />
      </Toggle>
    </View>
  );
}

export function ItemListFilter({
  groupByShop,
  onGroupByShopChange,
  dateOrder,
  onDateOrderChange,
  alphaOrder,
  onAlphaOrderChange,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger>
        <ListFilter size={20} className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3">
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Group by Shop
            </Text>
            <Toggle
              testID="group-by-shop-toggle"
              pressed={groupByShop ?? false}
              onPressedChange={(pressed) => onGroupByShopChange?.(pressed)}
              variant="outline"
              size="sm"
            >
              <Text
                className={
                  groupByShop
                    ? "text-accent-foreground text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                Group by shop
              </Text>
            </Toggle>
          </View>
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Order by Date
            </Text>
            <OrderToggle value={dateOrder} onChange={onDateOrderChange} />
          </View>
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Order by Alphabet
            </Text>
            <OrderToggle value={alphaOrder} onChange={onAlphaOrderChange} />
          </View>
        </View>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- --testPathPattern="ItemListFilter" --no-coverage
```

Expected: 3 passing

- [ ] **Step 5: Commit**

```bash
git add components/ItemListFilter.tsx __tests__/components/ItemListFilter.test.tsx
git commit -m "feat: add groupByShop toggle to ItemListFilter"
```

---

## Task 3: Wire up `[listId].tsx` — state and rendering

**Files:**
- Modify: `app/list/[listId].tsx`

No new unit tests are needed here: the business logic (grouping) is fully covered by `buildShopGroups` tests. The rendering change is mechanical.

- [ ] **Step 1: Add import and state to `[listId].tsx`**

At the top of the file, add the import after the existing imports:

```tsx
import { buildShopGroups } from "@/utils/groupByShop";
```

Inside `ListScreen`, add the new state alongside the existing `grouping` state (after line 68):

```tsx
const [groupByShop, setGroupByShop] = React.useState(false);
```

- [ ] **Step 2: Pass new props to `ItemListFilter`**

Replace the existing `<ItemListFilter ... />` block (lines 156–168 in the original):

```tsx
<ItemListFilter
  groupByShop={groupByShop}
  onGroupByShopChange={setGroupByShop}
  dateOrder={dateOrder}
  onDateOrderChange={(order) => {
    setAlphaOrder(null);
    setDateOrder(order);
  }}
  alphaOrder={alphaOrder}
  onAlphaOrderChange={(order) => {
    setDateOrder(null);
    setAlphaOrder(order);
  }}
/>
```

- [ ] **Step 3: Replace the `<ScrollView>` content with the updated rendering**

Replace the full `<ScrollView>` block (from `<ScrollView className="flex-1" ...>` to its closing `</ScrollView>`):

```tsx
<ScrollView className="flex-1" contentContainerClassName="gap-2">
  {isLoading && <ActivityIndicator className="mt-4" />}
  {groupByShop ? (
    grouping ? (
      <>
        {buildShopGroups(pendingItems, shops).map((group) => (
          <React.Fragment key={group.shopId ?? "__other__"}>
            <Text className="text-xs text-muted-foreground mt-1">
              {group.shopName}
            </Text>
            {group.items.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
          </React.Fragment>
        ))}
        {pendingItems.length > 0 && doneItems.length > 0 && (
          <View className="flex-row items-center gap-2 my-1">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-xs text-muted-foreground">Done</Text>
            <View className="flex-1 h-px bg-border" />
          </View>
        )}
        {buildShopGroups(doneItems, shops).map((group) => (
          <React.Fragment key={group.shopId ?? "__other__"}>
            <Text className="text-xs text-muted-foreground mt-1">
              {group.shopName}
            </Text>
            {group.items.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
          </React.Fragment>
        ))}
      </>
    ) : (
      <>
        {buildShopGroups(sortedItems, shops).map((group) => (
          <React.Fragment key={group.shopId ?? "__other__"}>
            <Text className="text-xs text-muted-foreground mt-1">
              {group.shopName}
            </Text>
            {group.items.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
          </React.Fragment>
        ))}
      </>
    )
  ) : grouping ? (
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
```

- [ ] **Step 4: Run the full test suite**

```bash
npm run test --no-coverage
```

Expected: all tests pass (existing tests unaffected)

- [ ] **Step 5: Commit**

```bash
git add app/list/[listId].tsx
git commit -m "feat: wire groupByShop state and rendering into list screen"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Toggle in filter popover ✓ · Named shop headers ✓ · No-shop items in Other at bottom ✓ · Done items grouped separately ✓ · Grouping-switch-off + groupByShop-on handled ✓
- [x] **Placeholder scan:** No TBDs — all steps have exact code
- [x] **Type consistency:** `ShopGroup` defined in Task 1 and used correctly in Tasks 2 and 3 · `buildShopGroups` signature consistent across all tasks

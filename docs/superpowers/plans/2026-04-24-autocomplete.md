# Autocomplete for Todo Item Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add autocomplete to the new-item input field in `app/list/[listId].tsx`, showing matching items from the current list and from items the user has created in any list, with smart re-surface/re-add behavior on selection.

**Architecture:** A new `useAutocomplete` hook filters current-list items in-memory (instant) and debounces a Supabase query for other-list matches, then merges and de-duplicates. `useTodoItems` gains `selectExistingItem` which updates an existing `todo_list_items` row with an optimistic state change. The screen wires both hooks together with a controlled `DropdownMenu`.

**Tech Stack:** React Native, Expo Router, Supabase JS SDK, `@rn-primitives/dropdown-menu`, Jest + `@testing-library/react-native`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `hooks/useAutocomplete.ts` | **Create** | `AutocompleteSuggestion` type, in-memory filtering, debounced Supabase query, `selectSuggestion` |
| `__tests__/hooks/useAutocomplete.test.ts` | **Create** | All hook unit tests |
| `hooks/useTodoItems.ts` | **Modify** | Add `selectExistingItem`; fix UPDATE broadcast to also sync `createdAt` |
| `app/list/[listId].tsx` | **Modify** | Wire `useAutocomplete`, render controlled `DropdownMenu` |

---

## Task 1: Add `selectExistingItem` to `useTodoItems` and fix UPDATE broadcast

**Files:**
- Modify: `hooks/useTodoItems.ts`

- [ ] **Step 1: Add `selectExistingItem` inside `useTodoItems`**

  Add this function after `toggleDone` (before the return statement) in `hooks/useTodoItems.ts`:

  ```ts
  async function selectExistingItem(listItemId: string, isDone: boolean): Promise<boolean> {
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { created_at: now };
    if (isDone) update.is_done = false;

    const previous = items;
    setItems((prev) =>
      prev.map((item) =>
        item.id === listItemId
          ? { ...item, createdAt: now, ...(isDone ? { isDone: false } : {}) }
          : item
      )
    );

    const { error } = await supabase
      .from("todo_list_items")
      .update(update)
      .eq("id", listItemId);

    if (error) {
      setItems(previous);
      Alert.alert("Error", "Failed to update item. Please try again.");
      return false;
    }

    return true;
  }
  ```

- [ ] **Step 2: Expose `selectExistingItem` in the hook return**

  Change the return statement in `hooks/useTodoItems.ts` from:

  ```ts
  return { items, isLoading, isSaving, addItem, removeItem, toggleDone };
  ```

  to:

  ```ts
  return { items, isLoading, isSaving, addItem, removeItem, toggleDone, selectExistingItem };
  ```

- [ ] **Step 3: Fix the UPDATE broadcast handler to also sync `createdAt`**

  In `hooks/useTodoItems.ts`, find the `.on("broadcast", { event: "UPDATE" }, ...)` handler and replace its body:

  ```ts
  .on("broadcast", { event: "UPDATE" }, ({ payload }) => {
    const record = payload.record;
    setItems((prev) =>
      prev.map((item) =>
        item.id === record.id
          ? {
              ...item,
              isDone: record.is_done ?? item.isDone,
              createdAt: record.created_at ?? item.createdAt,
            }
          : item,
      ),
    );
  })
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add hooks/useTodoItems.ts
  git commit -m "feat: add selectExistingItem to useTodoItems"
  ```

---

## Task 2: `AutocompleteSuggestion` type + in-memory filtering

**Files:**
- Create: `hooks/useAutocomplete.ts`
- Create: `__tests__/hooks/useAutocomplete.test.ts`

- [ ] **Step 1: Write the failing tests for in-memory filtering**

  Create `__tests__/hooks/useAutocomplete.test.ts`:

  ```ts
  import { renderHook } from '@testing-library/react-native';
  import { useAutocomplete } from '@/hooks/useAutocomplete';
  import { TodoItem } from '@/models/Todo';

  // Supabase mock — chained calls resolved lazily per test
  const mockGetUser = jest.fn();
  const mockEq = jest.fn();
  const mockIlike = jest.fn().mockReturnValue({ eq: mockEq });
  const mockSelect = jest.fn().mockReturnValue({ ilike: mockIlike });
  const mockInsert = jest.fn();
  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'todo_items') return { select: mockSelect };
    if (table === 'todo_list_items') return { insert: mockInsert };
    return {};
  });

  jest.mock('@/lib/supabase.config', () => ({
    supabase: {
      auth: { getUser: () => mockGetUser() },
      from: (table: string) => mockFrom(table),
    },
  }));

  const mockOnSelectExisting = jest.fn();

  const mockItems: TodoItem[] = [
    { id: 'li1', itemId: 'i1', itemName: 'Milk', createdAt: '2024-01-01T00:00:00Z', createdBy: 'u1', isDone: false },
    { id: 'li2', itemId: 'i2', itemName: 'Millet bread', createdAt: '2024-01-02T00:00:00Z', createdBy: 'u1', isDone: true },
    { id: 'li3', itemId: 'i3', itemName: 'Bread', createdAt: '2024-01-03T00:00:00Z', createdBy: 'u1', isDone: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ data: [], error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  describe('in-memory filtering', () => {
    it('returns empty suggestions when query is shorter than 2 characters', () => {
      const { result } = renderHook(() =>
        useAutocomplete('m', mockItems, 'list1', mockOnSelectExisting)
      );
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns matching current-list items for query >= 2 characters', () => {
      const { result } = renderHook(() =>
        useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
      );
      expect(result.current.suggestions).toEqual([
        { itemId: 'i1', listItemId: 'li1', name: 'Milk', isDone: false, source: 'current' },
        { itemId: 'i2', listItemId: 'li2', name: 'Millet bread', isDone: true, source: 'current' },
      ]);
    });

    it('matches case-insensitively', () => {
      const { result } = renderHook(() =>
        useAutocomplete('MI', mockItems, 'list1', mockOnSelectExisting)
      );
      expect(result.current.suggestions.map((s) => s.name)).toContain('Milk');
    });

    it('matches substring anywhere in the name', () => {
      const { result } = renderHook(() =>
        useAutocomplete('read', mockItems, 'list1', mockOnSelectExisting)
      );
      expect(result.current.suggestions.map((s) => s.name)).toContain('Bread');
      expect(result.current.suggestions.map((s) => s.name)).toContain('Millet bread');
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npm run test -- __tests__/hooks/useAutocomplete.test.ts --no-coverage
  ```

  Expected: FAIL — `Cannot find module '@/hooks/useAutocomplete'`

- [ ] **Step 3: Create `hooks/useAutocomplete.ts` with type + in-memory logic**

  ```ts
  import { TodoItem } from '@/models/Todo';
  import * as React from 'react';

  export type AutocompleteSuggestion = {
    itemId: string;
    listItemId?: string;
    name: string;
    isDone?: boolean;
    source: 'current' | 'other';
  };

  export function useAutocomplete(
    query: string,
    currentItems: TodoItem[],
    listId: string,
    onSelectExisting: (listItemId: string, isDone: boolean) => Promise<boolean>,
    maxSuggestions: number = 8
  ) {
    const [otherSuggestions, setOtherSuggestions] = React.useState<AutocompleteSuggestion[]>([]);

    const currentSuggestions = React.useMemo<AutocompleteSuggestion[]>(() => {
      if (query.length < 2) return [];
      const lower = query.toLowerCase();
      return currentItems
        .filter((item) => item.itemName.toLowerCase().includes(lower))
        .map((item) => ({
          itemId: item.itemId,
          listItemId: item.id,
          name: item.itemName,
          isDone: item.isDone,
          source: 'current' as const,
        }));
    }, [query, currentItems]);

    const suggestions = React.useMemo<AutocompleteSuggestion[]>(() => {
      const currentSlice = currentSuggestions.slice(0, maxSuggestions);
      const remaining = maxSuggestions - currentSlice.length;
      return [...currentSlice, ...otherSuggestions.slice(0, remaining)];
    }, [currentSuggestions, otherSuggestions, maxSuggestions]);

    async function selectSuggestion(_suggestion: AutocompleteSuggestion): Promise<void> {
      // implemented in Task 4
    }

    return { suggestions, selectSuggestion };
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test -- __tests__/hooks/useAutocomplete.test.ts --no-coverage
  ```

  Expected: PASS (all 4 in-memory filtering tests)

- [ ] **Step 5: Commit**

  ```bash
  git add hooks/useAutocomplete.ts __tests__/hooks/useAutocomplete.test.ts
  git commit -m "feat: add useAutocomplete hook with in-memory filtering"
  ```

---

## Task 3: Debounced Supabase query for other-list items

**Files:**
- Modify: `hooks/useAutocomplete.ts`
- Modify: `__tests__/hooks/useAutocomplete.test.ts`

- [ ] **Step 1: Write failing tests for the debounced query and de-duplication**

  Add these test blocks to `__tests__/hooks/useAutocomplete.test.ts` (after the existing `describe` block):

  ```ts
  describe('debounced other-list query', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not call Supabase when query is shorter than 2 characters', async () => {
      renderHook(() =>
        useAutocomplete('m', mockItems, 'list1', mockOnSelectExisting)
      );
      jest.advanceTimersByTime(400);
      expect(mockFrom).not.toHaveBeenCalledWith('todo_items');
    });

    it('appends other-list items after debounce resolves', async () => {
      mockEq.mockResolvedValue({
        data: [{ id: 'i9', name: 'Mild salsa' }],
        error: null,
      });

      const { result } = renderHook(() =>
        useAutocomplete('mi', [], 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(result.current.suggestions).toContainEqual(
        expect.objectContaining({ name: 'Mild salsa', source: 'other' })
      );
    });

    it('de-duplicates: suppresses other-list item whose name matches a current-list item', async () => {
      mockEq.mockResolvedValue({
        data: [
          { id: 'i9', name: 'Milk' },         // same name as current-list item
          { id: 'i10', name: 'Mild salsa' },   // unique
        ],
        error: null,
      });

      const { result } = renderHook(() =>
        useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      const names = result.current.suggestions.map((s) => s.name);
      expect(names.filter((n) => n === 'Milk')).toHaveLength(1); // only one
      expect(names).toContain('Mild salsa');
    });

    it('de-duplication is case-insensitive', async () => {
      mockEq.mockResolvedValue({
        data: [{ id: 'i9', name: 'MILK' }],
        error: null,
      });

      const { result } = renderHook(() =>
        useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      const milkEntries = result.current.suggestions.filter(
        (s) => s.name.toLowerCase() === 'milk'
      );
      expect(milkEntries).toHaveLength(1);
    });
  });

  describe('maxSuggestions', () => {
    it('current-list items fill slots first; other-list items take the remainder', async () => {
      jest.useFakeTimers();

      // 3 current matches
      const manyItems: TodoItem[] = [
        { id: 'la', itemId: 'a', itemName: 'aa', createdAt: '', createdBy: 'u1', isDone: false },
        { id: 'lb', itemId: 'b', itemName: 'ab', createdAt: '', createdBy: 'u1', isDone: false },
        { id: 'lc', itemId: 'c', itemName: 'ac', createdAt: '', createdBy: 'u1', isDone: false },
      ];

      // 5 other-list results
      mockEq.mockResolvedValue({
        data: [
          { id: 'd', name: 'ad' },
          { id: 'e', name: 'ae' },
          { id: 'f', name: 'af' },
          { id: 'g', name: 'ag' },
          { id: 'h', name: 'ah' },
        ],
        error: null,
      });

      const { result } = renderHook(() =>
        useAutocomplete('a', manyItems, 'list1', mockOnSelectExisting, 4)
      );

      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      // 4 total: 3 current + 1 other (4 - 3 = 1 remaining slot)
      expect(result.current.suggestions).toHaveLength(4);
      expect(result.current.suggestions.filter((s) => s.source === 'current')).toHaveLength(3);
      expect(result.current.suggestions.filter((s) => s.source === 'other')).toHaveLength(1);

      jest.useRealTimers();
    });
  });
  ```

  Also add `act` to the import at the top of the test file:

  ```ts
  import { act, renderHook } from '@testing-library/react-native';
  ```

- [ ] **Step 2: Run tests to confirm the new ones fail**

  ```bash
  npm run test -- __tests__/hooks/useAutocomplete.test.ts --no-coverage
  ```

  Expected: the 4 in-memory tests PASS, the new debounce/dedup/maxSuggestions tests FAIL.

- [ ] **Step 3: Add the debounced Supabase query to `hooks/useAutocomplete.ts`**

  Add this import at the top:

  ```ts
  import { supabase } from '@/lib/supabase.config';
  ```

  Add this `useEffect` inside the hook body, after the `currentSuggestions` useMemo and before the `suggestions` useMemo:

  ```ts
  React.useEffect(() => {
    if (query.length < 2) {
      setOtherSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('todo_items')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .eq('created_by', userId);

      if (!data) return;

      const currentNames = new Set(
        currentSuggestions.map((s) => s.name.toLowerCase())
      );

      setOtherSuggestions(
        data
          .filter((row) => !currentNames.has(row.name.toLowerCase()))
          .map((row) => ({
            itemId: row.id,
            name: row.name,
            source: 'other' as const,
          }))
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentSuggestions]);
  ```

- [ ] **Step 4: Run tests to confirm all pass**

  ```bash
  npm run test -- __tests__/hooks/useAutocomplete.test.ts --no-coverage
  ```

  Expected: PASS (all tests)

- [ ] **Step 5: Commit**

  ```bash
  git add hooks/useAutocomplete.ts __tests__/hooks/useAutocomplete.test.ts
  git commit -m "feat: add debounced Supabase query to useAutocomplete"
  ```

---

## Task 4: `selectSuggestion` implementation

**Files:**
- Modify: `hooks/useAutocomplete.ts`
- Modify: `__tests__/hooks/useAutocomplete.test.ts`

- [ ] **Step 1: Write failing tests for all three selection paths**

  Add this `describe` block to `__tests__/hooks/useAutocomplete.test.ts`:

  ```ts
  describe('selectSuggestion', () => {
    it('calls onSelectExisting with listItemId and isDone=false for a pending current-list item', async () => {
      mockOnSelectExisting.mockResolvedValue(true);
      const { result } = renderHook(() =>
        useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        await result.current.selectSuggestion({
          itemId: 'i1',
          listItemId: 'li1',
          name: 'Milk',
          isDone: false,
          source: 'current',
        });
      });

      expect(mockOnSelectExisting).toHaveBeenCalledWith('li1', false);
      expect(mockFrom).not.toHaveBeenCalledWith('todo_list_items');
    });

    it('calls onSelectExisting with listItemId and isDone=true for a done current-list item', async () => {
      mockOnSelectExisting.mockResolvedValue(true);
      const { result } = renderHook(() =>
        useAutocomplete('mi', mockItems, 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        await result.current.selectSuggestion({
          itemId: 'i2',
          listItemId: 'li2',
          name: 'Millet bread',
          isDone: true,
          source: 'current',
        });
      });

      expect(mockOnSelectExisting).toHaveBeenCalledWith('li2', true);
    });

    it('inserts into todo_list_items for an other-list item', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockInsert.mockResolvedValue({ error: null });

      const { result } = renderHook(() =>
        useAutocomplete('sa', [], 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        await result.current.selectSuggestion({
          itemId: 'i9',
          name: 'Mild salsa',
          source: 'other',
        });
      });

      expect(mockFrom).toHaveBeenCalledWith('todo_list_items');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          list_id: 'list1',
          item_id: 'i9',
          created_by: 'u1',
          is_done: false,
        })
      );
      expect(mockOnSelectExisting).not.toHaveBeenCalled();
    });

    it('shows an Alert when insert fails for an other-list item', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });

      const { result } = renderHook(() =>
        useAutocomplete('sa', [], 'list1', mockOnSelectExisting)
      );

      await act(async () => {
        await result.current.selectSuggestion({
          itemId: 'i9',
          name: 'Mild salsa',
          source: 'other',
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to add item. Please try again.');
    });
  });
  ```

  At the top of `__tests__/hooks/useAutocomplete.test.ts`, add an `Alert` import and update `beforeEach` to spy on it:

  ```ts
  // add to imports at top of file
  import { Alert } from 'react-native';
  ```

  Replace the existing `beforeEach` with:

  ```ts
  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ data: [], error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  ```

- [ ] **Step 2: Run tests to confirm the new ones fail**

  ```bash
  npm run test -- __tests__/hooks/useAutocomplete.test.ts --no-coverage
  ```

  Expected: previous tests PASS, new `selectSuggestion` tests FAIL.

- [ ] **Step 3: Implement `selectSuggestion` in `hooks/useAutocomplete.ts`**

  Add `Alert` import at the top:

  ```ts
  import { Alert } from 'react-native';
  ```

  Replace the placeholder `selectSuggestion` function with:

  ```ts
  async function selectSuggestion(suggestion: AutocompleteSuggestion): Promise<void> {
    if (suggestion.source === 'current' && suggestion.listItemId) {
      await onSelectExisting(suggestion.listItemId, suggestion.isDone ?? false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? '';

    const { error } = await supabase.from('todo_list_items').insert({
      list_id: listId,
      item_id: suggestion.itemId,
      created_by: userId,
      created_at: new Date().toISOString(),
      is_done: false,
    });

    if (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
  }
  ```

- [ ] **Step 4: Run all tests to confirm they pass**

  ```bash
  npm run test -- __tests__/hooks/useAutocomplete.test.ts --no-coverage
  ```

  Expected: PASS (all tests)

- [ ] **Step 5: Commit**

  ```bash
  git add hooks/useAutocomplete.ts __tests__/hooks/useAutocomplete.test.ts
  git commit -m "feat: implement selectSuggestion in useAutocomplete"
  ```

---

## Task 5: Wire autocomplete into `app/list/[listId].tsx`

**Files:**
- Modify: `app/list/[listId].tsx`

- [ ] **Step 1: Add imports**

  Add these imports at the top of `app/list/[listId].tsx`:

  ```ts
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { AutocompleteSuggestion, useAutocomplete } from "@/hooks/useAutocomplete";
  ```

- [ ] **Step 2: Destructure `selectExistingItem` from `useTodoItems` and wire `useAutocomplete`**

  Change line 20 in `app/list/[listId].tsx` from:

  ```ts
  const { items, isLoading, isSaving, addItem, removeItem, toggleDone } =
    useTodoItems(listId);
  ```

  to:

  ```ts
  const { items, isLoading, isSaving, addItem, removeItem, toggleDone, selectExistingItem } =
    useTodoItems(listId);

  const { suggestions, selectSuggestion } = useAutocomplete(
    inputText,
    items,
    listId,
    selectExistingItem
  );
  ```

  Place the `useAutocomplete` call on the line immediately after `const [inputText, setInputText] = React.useState("")` (line 22 in the original file), so it can reference `inputText` and `items`.

- [ ] **Step 3: Add `handleSelectSuggestion` handler**

  Add this function inside `ListScreen`, after `handleAdd`:

  ```ts
  async function handleSelectSuggestion(suggestion: AutocompleteSuggestion) {
    await selectSuggestion(suggestion);
    setInputText("");
  }
  ```

- [ ] **Step 4: Replace the input row JSX with the dropdown-wrapped version**

  Replace the existing `<View className="flex-row gap-2">` block (lines 55–67 in the original file) with:

  ```tsx
  <View className="flex-row gap-2">
    <DropdownMenu
      open={suggestions.length > 0 && inputText.length >= 2}
      onOpenChange={() => {}}
    >
      <DropdownMenuTrigger className="flex-1">
        <Input
          className="flex-1"
          placeholder="New item..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => inputText.trim() && handleAdd()}
          returnKeyType="done"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {suggestions.map((s) => (
          <DropdownMenuItem key={s.itemId} onPress={() => handleSelectSuggestion(s)}>
            <Text>{s.name}</Text>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    <Button disabled={!inputText.trim() || isSaving} onPress={handleAdd}>
      <Text>Add</Text>
    </Button>
  </View>
  ```

- [ ] **Step 5: Run the full test suite**

  ```bash
  npm run test --no-coverage
  ```

  Expected: PASS (all tests, no regressions)

- [ ] **Step 6: Run the dev server and manually verify the feature**

  ```bash
  npm run start
  ```

  Open the app, navigate to any list, and verify:
  1. No dropdown appears when fewer than 2 characters are typed
  2. Typing 2+ characters shows matching suggestions
  3. Selecting a pending current-list item bumps it to the top (date-sorted)
  4. Selecting a done current-list item un-checks it and bumps it to the top
  5. Selecting an other-list item adds it as a new pending entry
  6. Input clears after selection
  7. The regular Add button still works normally

- [ ] **Step 7: Commit**

  ```bash
  git add app/list/[listId].tsx
  git commit -m "feat: wire autocomplete dropdown into list screen"
  ```

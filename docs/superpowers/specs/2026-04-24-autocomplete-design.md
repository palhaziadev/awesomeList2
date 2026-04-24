# Autocomplete for Todo Item Input

**Date:** 2026-04-24  
**Status:** Approved

## Overview

Add autocomplete to the "New item..." input field on the list detail screen (`app/list/[listId].tsx`). As the user types, a dropdown suggests matching items from the current list and from items the user has created across all other lists. Selecting a suggestion either re-surfaces an existing item or pulls in an item from another list — without ever creating a duplicate `todo_item` record.

## Requirements

- Trigger: 2 or more characters typed in the input field
- Maximum suggestions shown: 8 (configurable via `maxSuggestions` param, default `8`)
- Sources (in priority order):
  1. Items already in the current list (both pending and done) whose `itemName` contains the query (case-insensitive substring match)
  2. `todo_items` rows where `created_by = current user` and `name` contains the query — **excluding** any whose name already appears in the current list results
- UI: flat list dropdown, no source badges, anchored directly below the input row

## Selection Behaviour

| Item state | Action |
|---|---|
| In current list, `is_done = false` | `UPDATE todo_list_items SET created_at = now() WHERE id = listItemId` |
| In current list, `is_done = true` | `UPDATE todo_list_items SET created_at = now(), is_done = false WHERE id = listItemId` |
| From another list | `INSERT INTO todo_list_items (list_id, item_id, created_by, created_at, is_done) VALUES (listId, itemId, userId, now(), false)` |

The "re-surface to top" intent: when sorted by date descending, bumping `created_at` moves the item to the front of the pending list.

## Architecture

### New file: `hooks/useAutocomplete.ts`

```ts
useAutocomplete(
  query: string,
  currentItems: TodoItem[],
  listId: string,
  maxSuggestions?: number  // default 8
): {
  suggestions: AutocompleteSuggestion[];
  selectSuggestion: (s: AutocompleteSuggestion) => Promise<void>;
}

type AutocompleteSuggestion = {
  itemId: string;       // todo_items.id
  listItemId?: string;  // todo_list_items.id — present only if already in current list
  name: string;
  isDone?: boolean;     // only relevant when source = "current"
  source: "current" | "other";
};
```

**Data flow:**

1. `query` changes → hook filters `currentItems` in-memory immediately (zero latency)
2. If `query.length >= 2`: debounced 300ms Supabase query on `todo_items` where `name ilike '%query%'` and `created_by = user.id`
3. Client-side de-duplication: drop any other-list result whose `name` matches a current-list result's `name` (case-insensitive comparison)
4. Merge: current-list results fill slots first, other-list results take the remainder, slice to `maxSuggestions`

### Modified: `hooks/useTodoItems.ts`

Add `selectExistingItem(listItemId: string, isDone: boolean): Promise<boolean>` for the update-only paths (pending and done current-list items). The insert path for other-list items lives inside `useAutocomplete` directly (it does not go through `addItem` to avoid triggering translation).

### Modified: `app/list/[listId].tsx`

- Wire `useAutocomplete(inputText, items, listId)` 
- Render `DropdownMenu` (`components/ui/dropdown-menu.tsx`) below the input row when `suggestions.length > 0` and `inputText.length >= 2`
- On suggestion select: call `selectSuggestion`, clear input, close dropdown
- Close dropdown on outside tap or input clear

## UI Behaviour

- Dropdown opens when `query.length >= 2` AND at least one suggestion exists
- In-memory (current list) results appear instantly; other-list results append when the Supabase query resolves
- No loading spinner — partial results are shown immediately
- Selecting a suggestion: clears input, closes dropdown (same UX as a successful Add)
- Tapping outside or clearing the input closes the dropdown

## Error Handling

- DB failure in `selectSuggestion`: show `Alert` matching existing pattern in `useTodoItems`, leave input unchanged
- No results: dropdown stays closed (no empty state UI)
- Query shorter than 2 characters: no Supabase request fired, dropdown closed

## Testing

File: `__tests__/hooks/useAutocomplete.test.ts`

- Returns empty suggestions when `query.length < 2`
- Filters current items in-memory with case-insensitive substring match
- De-duplicates: current-list item name suppresses same name from other-list results
- Respects `maxSuggestions`; current-list items fill slots first
- `selectSuggestion` calls correct Supabase path for each of the three selection cases (pending current, done current, other list)

## Out of Scope

- Keyboard navigation through suggestions (arrow keys)
- Highlighting the matching substring in each suggestion
- Translation triggered when adding from another list (no call to `translateText` — the existing `todo_item` record already has its translation)

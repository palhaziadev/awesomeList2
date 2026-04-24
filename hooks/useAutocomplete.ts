import { TodoItem } from '@/models/Todo';
import { supabase } from '@/lib/supabase.config';
import * as React from 'react';
import { Alert } from 'react-native';

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

  React.useEffect(() => {
    if (query.length < 2) {
      setOtherSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('todo_items')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .eq('created_by', userId);

      if (error || !data) {
        setOtherSuggestions([]);
        return;
      }

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

  const suggestions = React.useMemo<AutocompleteSuggestion[]>(() => {
    const currentSlice = currentSuggestions.slice(0, maxSuggestions);
    const remaining = maxSuggestions - currentSlice.length;
    return [...currentSlice, ...otherSuggestions.slice(0, remaining)];
  }, [currentSuggestions, otherSuggestions, maxSuggestions]);

  const selectSuggestion = React.useCallback(
    async (suggestion: AutocompleteSuggestion): Promise<void> => {
      if (suggestion.source === 'current' && suggestion.listItemId) {
        await onSelectExisting(suggestion.listItemId, suggestion.isDone ?? false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

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
    },
    [listId, onSelectExisting],
  );

  return { suggestions, selectSuggestion };
}

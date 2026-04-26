import { supabase } from "@/lib/supabase.config";
import { TodoItem } from "@/models/Todo";
import { translateText } from "@/services/translator.service";
import { mapRowToTodoItem } from "@/utils/mappers";
import { useFocusEffect } from "expo-router";
import * as React from "react";
import { Alert } from "react-native";

export function useTodoItems(listId: string) {
  const [items, setItems] = React.useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const channelCleanupRef = React.useRef<(() => void) | undefined>(undefined);
  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("todo_list_items")
      .select("*, todo_items(name, translation, translation_override)")
      .eq("list_id", listId);

    setIsLoading(false);

    if (error) {
      Alert.alert("Error", "Failed to load items.");
      return;
    }

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
  }, [listId]);

  const setupBroadcast = React.useCallback(async () => {
    await supabase.realtime.setAuth();

    const channel = supabase
      .channel(`todo_list_items:${listId}`, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, async ({ payload }) => {
        const record = payload.record;
        const { data } = await supabase
          .from("todo_items")
          .select("name, translation")
          .eq("id", record.item_id)
          .single();
        setItems((prev) => {
          if (prev.some((i) => i.id === record.id)) return prev;
          return [
            mapRowToTodoItem(
              record,
              data?.name ?? "",
              data?.translation ?? undefined,
            ),
            ...prev,
          ];
        });
      })
      .on("broadcast", { event: "UPDATE" }, async ({ payload }) => {
        const record = payload.record;
        let translationOverride: string | undefined = undefined;
        if (record.item_id) {
          const { data } = await supabase
            .from("todo_items")
            .select("translation_override")
            .eq("id", record.item_id)
            .single();
          translationOverride = data?.translation_override ?? undefined;
        }
        setItems((prev) =>
          prev.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  isDone: record.is_done ?? item.isDone,
                  createdAt: record.created_at ?? item.createdAt,
                  shopId: record.shop_id != null ? String(record.shop_id) : item.shopId,
                  translationOverride,
                }
              : item,
          ),
        );
      })
      .on("broadcast", { event: "DELETE" }, ({ payload }) => {
        setItems((prev) =>
          prev.filter((item) => item.id !== payload.old_record.id),
        );
      })
      .subscribe();

    channelCleanupRef.current = () => supabase.removeChannel(channel);
  }, [listId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchItems();
      setupBroadcast();

      return () => {
        channelCleanupRef.current?.();
        channelCleanupRef.current = undefined;
      };
    }, [fetchItems, setupBroadcast]),
  );

  const addItem = React.useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      Alert.alert("Error", "Failed to authenticate. Please try again.");
      return false;
    }

    const { translatedText, error: translateError } = await translateText(trimmed);
    if (translateError) Alert.alert("Translation error", translateError);

    const translation: string | undefined = translatedText ?? undefined;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const createdBy = userData.user?.id ?? "";

      const { error: itemsError, data: itemData } = await supabase
        .from("todo_items")
        .insert({
          name: trimmed,
          translation,
          created_by: createdBy,
          created_at: now,
        })
        .select()
        .single();

      if (itemsError) {
        Alert.alert("Error", "Failed to add item. Please try again.");
        return false;
      }

      const { error: listItemsError } = await supabase
        .from("todo_list_items")
        .insert({
          list_id: listId,
          item_id: itemData.id.toString(),
          created_by: createdBy,
          created_at: now,
          is_done: false,
        })
        .select()
        .single();

      if (listItemsError) {
        Alert.alert("Error", "Failed to add item. Please try again.");
        return false;
      }

      return true;
    } finally {
      setIsSaving(false);
    }
  }, [listId]);

  const removeItem = React.useCallback(async (id: string) => {
    const snapshot = itemsRef.current;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase
      .from("todo_list_items")
      .delete()
      .eq("id", id);
    if (error) {
      setItems(snapshot);
      Alert.alert("Error", "Failed to remove item. Please try again.");
    }
  }, []);

  const toggleDone = React.useCallback(async (id: string, isDone: boolean) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return;

    const updatedBy = userData.user?.id ?? "";
    const updatedAt = new Date().toISOString();

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDone } : item)),
    );

    const { error } = await supabase
      .from("todo_list_items")
      .update({ is_done: isDone, updated_by: updatedBy, updated_at: updatedAt })
      .eq("id", id);

    if (error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isDone: !isDone } : item,
        ),
      );
      Alert.alert("Error", "Failed to update item. Please try again.");
    }
  }, []);

  const selectExistingItem = React.useCallback(async (
    listItemId: string,
    isDone: boolean,
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { created_at: now };
    if (isDone) update.is_done = false;

    const snapshot = itemsRef.current;
    setItems((prev) =>
      prev.map((item) =>
        item.id === listItemId
          ? { ...item, createdAt: now, ...(isDone ? { isDone: false } : {}) }
          : item,
      ),
    );

    const { error } = await supabase
      .from("todo_list_items")
      .update(update)
      .eq("id", listItemId);

    if (error) {
      setItems(snapshot);
      Alert.alert("Error", "Failed to update item. Please try again.");
      return false;
    }

    return true;
  }, []);

  const renameItem = React.useCallback(async (id: string, newName: string): Promise<boolean> => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return false;

    const trimmed = newName.trim();
    if (!trimmed || trimmed === item.itemName) return false;

    const { translatedText, error: translateError } = await translateText(trimmed);
    if (translateError) Alert.alert("Translation error", translateError);

    const snapshot = itemsRef.current;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, itemName: trimmed, translation: translatedText ?? undefined, translationOverride: undefined }
          : i,
      ),
    );

    const { error } = await supabase
      .from("todo_items")
      .update({ name: trimmed, translation: translatedText ?? null, translation_override: null })
      .eq("id", item.itemId);

    if (error) {
      setItems(snapshot);
      Alert.alert("Error", "Failed to rename item. Please try again.");
      return false;
    }

    return true;
  }, []);

  const updateItem = React.useCallback(async (
    id: string,
    patch: { translationOverride: string | null; shopId: string | null },
  ): Promise<boolean> => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return false;

    const snapshot = itemsRef.current;
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
      setItems(snapshot);
      Alert.alert("Error", "Failed to update item. Please try again.");
      return false;
    }

    return true;
  }, []);

  return {
    items,
    isLoading,
    isSaving,
    addItem,
    removeItem,
    toggleDone,
    updateItem,
    renameItem,
    selectExistingItem,
  };
}

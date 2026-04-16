import { supabase } from "@/lib/supabase.config";
import { TodoItem } from "@/models/Todo";
import { mapRowToTodoItem } from "@/utils/mappers";
import { useFocusEffect } from "expo-router";
import * as React from "react";
import { Alert } from "react-native";

export function useTodoItems(listId: string) {
  const [items, setItems] = React.useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // Holds the channel cleanup; assigned asynchronously after subscribe()
      let channelCleanup: (() => void) | undefined;

      async function fetchItems() {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("todo_list_items")
          .select("*, todo_items(name)")
          .eq("list_id", listId);

        setIsLoading(false);

        if (error) {
          Alert.alert("Error", "Failed to load items.");
          return;
        }

        setItems(
          (data ?? []).map((row) => mapRowToTodoItem(row, row.todo_items?.name ?? "")),
        );
      }

      async function setupBroadcast() {
        await supabase.realtime.setAuth();

        const channel = supabase
          .channel(`todo_list_items:${listId}`, { config: { private: true } })
          .on("broadcast", { event: "INSERT" }, async ({ payload }) => {
            const record = payload.record;
            const { data } = await supabase
              .from("todo_items")
              .select("name")
              .eq("id", record.item_id)
              .single();
            setItems((prev) => {
              if (prev.some((i) => i.id === record.id)) return prev;
              return [mapRowToTodoItem(record, data?.name ?? ""), ...prev];
            });
          })
          .on("broadcast", { event: "UPDATE" }, ({ payload }) => {
            const record = payload.record;
            setItems((prev) =>
              prev.map((item) =>
                item.id === record.id
                  ? { ...item, isDone: record.is_done ?? item.isDone }
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

        channelCleanup = () => supabase.removeChannel(channel);
      }

      fetchItems();
      setupBroadcast();

      // Cleanup runs synchronously when the screen loses focus.
      // channelCleanup is set asynchronously but will be defined by then.
      return () => channelCleanup?.();
    }, [listId]),
  );

  async function addItem(text: string): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      Alert.alert("Error", "Failed to authenticate. Please try again.");
      return false;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const createdBy = userData.user?.id ?? "";

      const { error: itemsError, data: itemData } = await supabase
        .from("todo_items")
        .insert({ name: trimmed, created_by: createdBy, created_at: now })
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
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("todo_list_items").delete().eq("id", id);
    if (error) {
      Alert.alert("Error", "Failed to remove item. Please try again.");
    }
  }

  return { items, isLoading, isSaving, addItem, removeItem };
}

import { TRANSLATION_SOURCE_LANG, TRANSLATION_TARGET_LANG } from "@/lib/constants";
import { supabase } from "@/lib/supabase.config";
import { TodoItem } from "@/models/Todo";
import { mapRowToTodoItem } from "@/utils/mappers";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { useFocusEffect } from "expo-router";
import * as React from "react";
import { Alert } from "react-native";

export function useTodoItems(listId: string) {
  const [items, setItems] = React.useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const channelCleanupRef = React.useRef<(() => void) | undefined>(undefined);

  useFocusEffect(
    React.useCallback(() => {

      async function fetchItems() {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("todo_list_items")
          .select("*, todo_items(name, translation)")
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
            ),
          ),
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

        channelCleanupRef.current = () => supabase.removeChannel(channel);
      }

      fetchItems();
      setupBroadcast();

      return () => {
        channelCleanupRef.current?.();
        channelCleanupRef.current = undefined;
      };
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

    const { data, error } = await supabase.functions.invoke("translator", {
      body: {
        text: text.toLowerCase(),
        targetLanguage: TRANSLATION_TARGET_LANG,
        sourceLanguage: TRANSLATION_SOURCE_LANG,
      },
    });

    if (error) {
      let message =
        "Translation failed. The item will be added without a translation.";
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (body?.message) message = body.message;
      } else if (error instanceof FunctionsFetchError) {
        message =
          "Could not reach the translation service. Check your connection.";
      } else if (error instanceof FunctionsRelayError) {
        message = "Translation service is temporarily unavailable.";
      }
      Alert.alert("Translation error", message);
    }

    const translation: string | undefined = data?.translatedText ?? undefined;

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
  }

  async function removeItem(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase
      .from("todo_list_items")
      .delete()
      .eq("id", id);
    if (error) {
      setItems(previous);
      Alert.alert("Error", "Failed to remove item. Please try again.");
    }
  }

  async function toggleDone(id: string, isDone: boolean) {
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
  }

  return { items, isLoading, isSaving, addItem, removeItem, toggleDone };
}

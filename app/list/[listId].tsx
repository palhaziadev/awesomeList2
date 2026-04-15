import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase.config";
import { TodoItem } from "@/models/Todo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, {
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListScreen() {
  const router = useRouter();
  const { listId, listName } = useLocalSearchParams<{
    listId: string;
    listName: string;
  }>();

  const [items, setItems] = React.useState<TodoItem[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const isAdding = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      async function fetchItems() {
        const { data, error } = await supabase
          .from("todo_list_items")
          .select("*, todo_items(name)")
          .eq("list_id", listId);

        setIsLoading(false);

        if (error) {
          Alert.alert("Error", error.message);
          return;
        }

        setItems(
          (data ?? []).map((row) => ({
            itemId: row.item_id,
            itemName: row.todo_items?.name ?? "",
            createdAt: row.created_at,
            createdBy: row.created_by ?? "",
            isDone: row.is_done ?? false,
          })),
        );
      }

      setIsLoading(true);
      fetchItems();
    }, [listId]),
  );

  async function handleAdd() {
    if (!inputText.trim()) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      Alert.alert("Error", userError.message);
      return;
    }

    const now = new Date().toISOString();
    const newItem: TodoItem = {
      itemId: Date.now().toString(),
      itemName: inputText.trim(),
      createdAt: now,
      createdBy: userData.user?.id ?? "",
      isDone: false,
    };

    setIsSaving(true);

    const { error: itemsError, data: itemData } = await supabase
      .from("todo_items")
      .insert({
        name: newItem.itemName,
        created_by: newItem.createdBy,
        created_at: newItem.createdAt,
      })
      .select()
      .single();

    if (itemsError) {
      Alert.alert("Error", itemsError.message);
      return;
    }

    const { error: listItemsError } = await supabase
      .from("todo_list_items")
      .insert({
        list_id: listId,
        item_id: itemData?.id,
        created_by: newItem.createdBy,
        created_at: newItem.createdAt,
        is_done: false,
      })
      .select()
      .single();

    if (listItemsError) {
      Alert.alert("Error", listItemsError.message);
      return;
    }

    setIsSaving(false);

    isAdding.current = true;
    setItems((prev) => [newItem, ...prev]);
    setInputText("");
  }

  function handleRemove(itemId: string) {
    isAdding.current = false;
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    supabase.from("todo_list_items").delete().eq("id", itemId);
  }

  return (
    <SafeAreaView className="flex-1 p-4 gap-3">
      <View className="flex-row items-center gap-2 mb-1">
        <Pressable onPress={() => router.back()} className="pr-2">
          <Text className="text-primary text-base">←</Text>
        </Pressable>
        <Text className="text-xl font-semibold flex-1" numberOfLines={1}>
          {listName}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Input
          className="flex-1"
          placeholder="New item..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Button disabled={!inputText.trim() || isSaving} onPress={handleAdd}>
          <Text>Add</Text>
        </Button>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {isLoading && <ActivityIndicator className="mt-4" />}
        {items.map((item) => (
          <Animated.View
            key={item.itemId}
            entering={SlideInLeft.delay(300)}
            exiting={SlideOutRight}
            layout={
              isAdding.current ? LinearTransition : LinearTransition.delay(300)
            }
          >
            <View className="flex-row items-center border border-border rounded-md p-3 bg-background">
              <Text className="flex-1 text-sm font-medium">
                {item.itemName}
              </Text>
              <Button
                variant="ghost"
                size="icon"
                onPress={() => handleRemove(item.itemId)}
              >
                <X size={16} className="text-muted-foreground" />
              </Button>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

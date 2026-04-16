import { ScreenHeader } from "@/components/ScreenHeader";
import { TodoItemRow } from "@/components/TodoItemRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useTodoItems } from "@/hooks/useTodoItems";
import { useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListScreen() {
  const { listId, listName } = useLocalSearchParams<{
    listId: string;
    listName: string;
  }>();

  const { items, isLoading, isSaving, addItem, removeItem, toggleDone } =
    useTodoItems(listId);
  const [inputText, setInputText] = React.useState("");

  async function handleAdd() {
    const success = await addItem(inputText);
    if (success) setInputText("");
  }

  return (
    <SafeAreaView className="flex-1 p-4 gap-3">
      <ScreenHeader title={listName} />
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
          <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

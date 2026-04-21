import { ScreenHeader } from "@/components/ScreenHeader";
import { TodoItemRow } from "@/components/TodoItemRow";
import { Button } from "@/components/ui/button";
import { ItemListFilter } from "@/components/ItemListFilter";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  const [grouping, setGrouping] = React.useState(true);

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
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">Grouping</Text>
        <View className="flex-row items-center gap-3">
          <Switch checked={grouping} onCheckedChange={setGrouping} />
          <ItemListFilter />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {isLoading && <ActivityIndicator className="mt-4" />}
        {grouping ? (
          <>
            {items
              .filter((item) => !item.isDone)
              .map((item) => (
                <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
              ))}
            {items.some((item) => !item.isDone) && items.some((item) => item.isDone) && (
              <View className="flex-row items-center gap-2 my-1">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-xs text-muted-foreground">Done</Text>
                <View className="flex-1 h-px bg-border" />
              </View>
            )}
            {items
              .filter((item) => item.isDone)
              .map((item) => (
                <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
              ))}
          </>
        ) : (
          items.map((item) => (
            <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

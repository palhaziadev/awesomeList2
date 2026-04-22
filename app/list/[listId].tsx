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
  const [dateOrder, setDateOrder] = React.useState<"asc" | "desc" | null>(null);
  const [alphaOrder, setAlphaOrder] = React.useState<"asc" | "desc" | null>(null);

  const sortedItems = React.useMemo(() => {
    let result = [...items];
    if (dateOrder) {
      result.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return dateOrder === "asc" ? diff : -diff;
      });
    }
    if (alphaOrder) {
      result.sort((a, b) => {
        const cmp = a.itemName.localeCompare(b.itemName);
        return alphaOrder === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [items, dateOrder, alphaOrder]);

  const pendingItems = React.useMemo(() => sortedItems.filter((i) => !i.isDone), [sortedItems]);
  const doneItems = React.useMemo(() => sortedItems.filter((i) => i.isDone), [sortedItems]);

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
          onSubmitEditing={() => inputText.trim() && handleAdd()}
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
          <ItemListFilter
            dateOrder={dateOrder}
            onDateOrderChange={(order) => { setAlphaOrder(null); setDateOrder(order); }}
            alphaOrder={alphaOrder}
            onAlphaOrderChange={(order) => { setDateOrder(null); setAlphaOrder(order); }}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {isLoading && <ActivityIndicator className="mt-4" />}
        {grouping ? (
          <>
            {pendingItems.map((item) => (
              <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
            ))}
            {pendingItems.length > 0 && doneItems.length > 0 && (
              <View className="flex-row items-center gap-2 my-1">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-xs text-muted-foreground">Done</Text>
                <View className="flex-1 h-px bg-border" />
              </View>
            )}
            {doneItems.map((item) => (
              <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
            ))}
          </>
        ) : (
          sortedItems.map((item) => (
            <TodoItemRow key={item.id} item={item} onRemove={removeItem} onToggleDone={toggleDone} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

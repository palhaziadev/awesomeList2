import { EditItemDialog } from "@/components/EditItemDialog";
import { ItemListFilter } from "@/components/ItemListFilter";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TodoItemRow } from "@/components/TodoItemRow";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  AutocompleteSuggestion,
  useAutocomplete,
} from "@/hooks/useAutocomplete";
import { useShops } from "@/hooks/useShops";
import { useTodoItems } from "@/hooks/useTodoItems";
import { TodoItem } from "@/models/Todo";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListScreen() {
  const { listId, listName } = useLocalSearchParams<{
    listId: string;
    listName: string;
  }>();

  const {
    items,
    isLoading,
    isSaving,
    addItem,
    removeItem,
    toggleDone,
    updateItem,
    selectExistingItem,
  } = useTodoItems(listId);
  const { shops } = useShops();
  const [selectedItem, setSelectedItem] = React.useState<TodoItem | null>(null);
  const [inputText, setInputText] = React.useState("");
  const { suggestions, selectSuggestion } = useAutocomplete(
    inputText,
    items,
    listId,
    selectExistingItem,
  );
  const triggerRef = React.useRef<TriggerRef>(null);
  const [userDismissed, setUserDismissed] = React.useState(false);
  const shouldOpen =
    suggestions.length > 0 && inputText.length >= 2 && !userDismissed;
  React.useEffect(() => {
    if (shouldOpen) {
      triggerRef.current?.open();
    } else {
      triggerRef.current?.close();
    }
  }, [shouldOpen]);
  React.useEffect(() => {
    setUserDismissed(false);
  }, [inputText]);
  const [grouping, setGrouping] = React.useState(true);
  const [dateOrder, setDateOrder] = React.useState<"asc" | "desc" | null>(
    "desc",
  );
  const [alphaOrder, setAlphaOrder] = React.useState<"asc" | "desc" | null>(
    null,
  );

  const sortedItems = React.useMemo(() => {
    let result = [...items];
    if (dateOrder) {
      result.sort((a, b) => {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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

  const pendingItems = React.useMemo(
    () => sortedItems.filter((i) => !i.isDone),
    [sortedItems],
  );
  const doneItems = React.useMemo(
    () => sortedItems.filter((i) => i.isDone),
    [sortedItems],
  );

  async function handleAdd() {
    const success = await addItem(inputText);
    if (success) setInputText("");
  }

  async function handleSelectSuggestion(suggestion: AutocompleteSuggestion) {
    await selectSuggestion(suggestion);
    setInputText("");
  }

  return (
    <SafeAreaView className="flex-1 p-4 gap-3">
      <ScreenHeader title={listName} />
      <View className="flex-row gap-2">
        <DropdownMenu
          className="flex-1"
          onOpenChange={(open) => {
            if (!open) setUserDismissed(true);
          }}
        >
          <DropdownMenuTrigger ref={triggerRef} className="flex-1">
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
              <DropdownMenuItem
                key={s.itemId}
                onPress={() => handleSelectSuggestion(s)}
              >
                <Text>{s.name}</Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
            onDateOrderChange={(order) => {
              setAlphaOrder(null);
              setDateOrder(order);
            }}
            alphaOrder={alphaOrder}
            onAlphaOrderChange={(order) => {
              setDateOrder(null);
              setAlphaOrder(order);
            }}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {isLoading && <ActivityIndicator className="mt-4" />}
        {grouping ? (
          <>
            {pendingItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
            {pendingItems.length > 0 && doneItems.length > 0 && (
              <View className="flex-row items-center gap-2 my-1">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-xs text-muted-foreground">Done</Text>
                <View className="flex-1 h-px bg-border" />
              </View>
            )}
            {doneItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={() => setSelectedItem(item)}
              />
            ))}
          </>
        ) : (
          sortedItems.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onRemove={removeItem}
              onToggleDone={toggleDone}
              onPress={() => setSelectedItem(item)}
            />
          ))
        )}
      </ScrollView>
      <EditItemDialog
        item={selectedItem}
        shops={shops}
        onSave={(patch) => {
          if (selectedItem) updateItem(selectedItem.id, patch);
          setSelectedItem(null);
        }}
        onClose={() => setSelectedItem(null)}
      />
    </SafeAreaView>
  );
}

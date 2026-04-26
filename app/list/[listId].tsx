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
import { useListSettings } from "@/hooks/useListSettings";
import { useShops } from "@/hooks/useShops";
import { useTodoItems } from "@/hooks/useTodoItems";
import { TodoItem } from "@/models/Todo";
import { ShopGroup, buildShopGroups } from "@/utils/groupByShop";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function DoneDivider() {
  return (
    <View className="flex-row items-center gap-2 my-1">
      <View className="flex-1 h-px bg-border" />
      <Text className="text-xs text-muted-foreground">Done</Text>
      <View className="flex-1 h-px bg-border" />
    </View>
  );
}

type ShopGroupSectionProps = {
  groups: ShopGroup[];
  onRemove: (id: string) => void;
  onToggleDone: (id: string, isDone: boolean) => void;
  onPress: (item: TodoItem) => void;
};

const ShopGroupSection = React.memo(function ShopGroupSection({
  groups,
  onRemove,
  onToggleDone,
  onPress,
}: ShopGroupSectionProps) {
  return (
    <>
      {groups.map((group) => (
        <React.Fragment key={group.shopId ?? "__other__"}>
          <Text className="text-xs text-muted-foreground mt-1">
            {group.shopName}
          </Text>
          {group.items.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              onToggleDone={onToggleDone}
              onPress={onPress}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
});

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
    renameItem,
    selectExistingItem,
  } = useTodoItems(listId);
  const { shops } = useShops();
  const [selectedItem, setSelectedItem] = React.useState<TodoItem | null>(null);
  const liveSelectedItem = React.useMemo(
    () => selectedItem ? (items.find((i) => i.id === selectedItem.id) ?? selectedItem) : null,
    [items, selectedItem],
  );
  const [inputText, setInputText] = React.useState("");
  const { suggestions, selectSuggestion } = useAutocomplete(
    inputText,
    items,
    listId,
    selectExistingItem,
  );
  const triggerRef = React.useRef<TriggerRef>(null);
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>(undefined);
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
  const { settings, update } = useListSettings();
  const { groupbyIsDone, groupByShop, dateOrder, alphaOrder } = settings;

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

  const pendingShopGroups = React.useMemo(
    () => (groupByShop ? buildShopGroups(pendingItems, shops) : []),
    [groupByShop, pendingItems, shops],
  );
  const doneShopGroups = React.useMemo(
    () => (groupByShop ? buildShopGroups(doneItems, shops) : []),
    [groupByShop, doneItems, shops],
  );
  const allShopGroups = React.useMemo(
    () => (groupByShop ? buildShopGroups(sortedItems, shops) : []),
    [groupByShop, sortedItems, shops],
  );

  const handleItemPress = React.useCallback((item: TodoItem) => {
    setSelectedItem(item);
  }, []);

  const handleAdd = React.useCallback(async () => {
    if (!inputText.trim()) return;
    const success = await addItem(inputText);
    if (success) setInputText("");
  }, [addItem, inputText]);

  const handleSelectSuggestion = React.useCallback(async (suggestion: AutocompleteSuggestion) => {
    await selectSuggestion(suggestion);
    setInputText("");
  }, [selectSuggestion]);

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
          <DropdownMenuTrigger
            ref={triggerRef}
            className="flex-1"
            onLayout={(e) => setTriggerWidth(e.nativeEvent.layout.width)}
          >
            <Input
              className="flex-1"
              placeholder="New item..."
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent style={triggerWidth ? { width: triggerWidth } : undefined}>
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
          <Switch checked={groupbyIsDone} onCheckedChange={(value) => update({ groupbyIsDone: value })} />
          <ItemListFilter
            groupByShop={groupByShop}
            onGroupByShopChange={(value) => update({ groupByShop: value })}
            dateOrder={dateOrder}
            onDateOrderChange={(order) => update({ alphaOrder: null, dateOrder: order })}
            alphaOrder={alphaOrder}
            onAlphaOrderChange={(order) => update({ dateOrder: null, alphaOrder: order })}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {isLoading && <ActivityIndicator className="mt-4" />}
        {groupByShop ? (
          groupbyIsDone ? (
            <>
              <ShopGroupSection
                groups={pendingShopGroups}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={handleItemPress}
              />
              {pendingItems.length > 0 && doneItems.length > 0 && <DoneDivider />}
              <ShopGroupSection
                groups={doneShopGroups}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={handleItemPress}
              />
            </>
          ) : (
            <ShopGroupSection
              groups={allShopGroups}
              onRemove={removeItem}
              onToggleDone={toggleDone}
              onPress={handleItemPress}
            />
          )
        ) : groupbyIsDone ? (
          <>
            {pendingItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={handleItemPress}
              />
            ))}
            {pendingItems.length > 0 && doneItems.length > 0 && <DoneDivider />}
            {doneItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                onRemove={removeItem}
                onToggleDone={toggleDone}
                onPress={handleItemPress}
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
              onPress={handleItemPress}
            />
          ))
        )}
      </ScrollView>
      <EditItemDialog
        item={liveSelectedItem}
        shops={shops}
        onSave={(patch) => {
          if (selectedItem) updateItem(selectedItem.id, patch);
          setSelectedItem(null);
        }}
        onRename={(newName) => {
          if (selectedItem) renameItem(selectedItem.id, newName);
        }}
        onClose={() => setSelectedItem(null)}
      />
    </SafeAreaView>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { TodoList } from "@/models/Todo";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { LinearTransition, SlideInLeft, SlideOutRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [lists, setLists] = React.useState<TodoList[]>([]);
  const [inputText, setInputText] = React.useState("");
  const isAdding = React.useRef(false);

  function handleAdd() {
    if (!inputText.trim()) return;
    const newList: TodoList = {
      listId: Date.now().toString(),
      listName: inputText.trim(),
      createdAt: new Date().toISOString(),
      owner: "",
      createdBy: "",
      items: [],
    };
    isAdding.current = true;
    setLists((prev) => [newList, ...prev]);
    setInputText("");
  }

  function handleRemove(listId: string) {
    isAdding.current = false;
    setLists((prev) => prev.filter((l) => l.listId !== listId));
  }

  return (
    <SafeAreaView className="flex-1 p-4 gap-3">
      <View className="flex-row gap-2">
        <Input
          className="flex-1"
          placeholder="New list name..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Button disabled={!inputText.trim()} onPress={handleAdd}>
          <Text>Add</Text>
        </Button>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-2">
        {lists.map((list) => (
          <Animated.View
            key={list.listId}
            entering={SlideInLeft.delay(300)}
            exiting={SlideOutRight}
            layout={isAdding.current ? LinearTransition : LinearTransition.delay(300)}
          >
            <Pressable
              className="flex-row items-center border border-border rounded-md p-3 bg-background"
              onPress={() => router.push("/(tabs)/explore")}
            >
              <Text className="flex-1 text-sm font-medium">
                {list.listName}
              </Text>
              <Button
                variant="ghost"
                size="icon"
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemove(list.listId);
                }}
              >
                <X size={16} className="text-muted-foreground" />
              </Button>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

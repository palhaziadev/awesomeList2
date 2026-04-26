import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { LoginPromptDialog } from "@/components/LoginPromptDialog";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase.config";
import { TodoList } from "@/models/Todo";
import { useFocusEffect, useRouter } from "expo-router";
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

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [lists, setLists] = React.useState<TodoList[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const isAdding = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      async function fetchLists() {
        const { data, error } = await supabase
          .from("todo_list")
          .select("*")
          .order("created_at", { ascending: false });

        setIsLoading(false);

        if (error) {
          Alert.alert("Error", error.message);
          return;
        }

        setLists(
          (data ?? []).map((row) => ({
            listId: row.id,
            listName: row.list_name,
            owner: row.owner ?? "",
            createdBy: row.created_by ?? "",
            createdAt: row.created_at,
            items: [],
          })),
        );
      }

      setIsLoading(true);
      fetchLists();
    }, []),
  );

  async function handleAdd() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      Alert.alert("Error", userError.message);
      return;
    }
    if (!inputText.trim()) return;
    const now = new Date().toISOString();
    const newList: TodoList = {
      listId: "",
      listName: inputText.trim(),
      createdAt: now,
      owner: userData.user?.id ?? "",
      createdBy: userData.user?.id ?? "",
      items: [],
    };

    setIsSaving(true);
    const { data: insertedList, error } = await supabase
      .from("todo_list")
      .insert({
        list_name: newList.listName,
        created_by: newList.createdBy,
        created_at: newList.createdAt,
      })
      .select()
      .single();
    setIsSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    isAdding.current = true;
    setLists((prev) => [{ ...newList, listId: insertedList.id }, ...prev]);
    setInputText("");
  }

  function handleRemove(listId: string) {
    isAdding.current = false;
    setLists((prev) => prev.filter((l) => l.listId !== listId));
  }

  return (
    <SafeAreaView className="flex-1 p-4 gap-3">
      <LoginPromptDialog open={!isAuthLoading && !user} />
      <View className="flex-row gap-2">
        <Input
          className="flex-1"
          placeholder="New list name..."
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
        {lists.map((list) => (
          <Animated.View
            key={list.listId}
            entering={SlideInLeft.delay(300)}
            exiting={SlideOutRight}
            layout={
              isAdding.current ? LinearTransition : LinearTransition.delay(300)
            }
          >
            <Pressable
              className="flex-row items-center border border-border rounded-md p-3 bg-background"
              onPress={() =>
                router.push({
                  pathname: "/list/[listId]",
                  params: { listId: list.listId, listName: list.listName },
                })
              }
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

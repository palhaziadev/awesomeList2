import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { SHOP_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TodoItem } from "@/models/Todo";
import { X } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, {
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";

type Props = {
  item: TodoItem;
  onRemove: (id: string) => void;
  onToggleDone: (id: string, isDone: boolean) => void;
  onPress: () => void;
};

export function TodoItemRow({ item, onRemove, onToggleDone, onPress }: Props) {
  const displayTranslation = item.translationOverride ?? item.translation;
  const shopColor = item.shopId ? SHOP_COLORS[item.shopId] : undefined;
  return (
    <Animated.View
      entering={SlideInLeft.delay(300)}
      exiting={SlideOutRight}
      layout={LinearTransition}
    >
      <View className="flex-row items-center border border-border rounded-md p-3 bg-background gap-3 overflow-hidden">
        <Checkbox
          checked={item.isDone ?? false}
          onCheckedChange={(checked) => onToggleDone(item.id, !!checked)}
        />
        <Pressable className="flex-1" onPress={onPress}>
          <Text
            className={cn(
              "text-sm font-medium",
              item.isDone && "line-through text-muted-foreground",
            )}
          >
            {item.itemName}
          </Text>
          {displayTranslation ? (
            <Text className="text-xs text-muted-foreground">
              {displayTranslation}
            </Text>
          ) : null}
        </Pressable>
        <View className="items-center justify-center">
          {shopColor && (
            <View
              className="absolute inset-0 rounded-sm"
              style={{ backgroundColor: shopColor }}
            />
          )}
          <Button variant="ghost" size="icon" onPress={() => onRemove(item.id)}>
            <X size={16} className="text-muted-foreground" />
          </Button>
        </View>
      </View>
    </Animated.View>
  );
}

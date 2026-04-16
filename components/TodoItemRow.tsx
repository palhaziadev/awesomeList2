import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { TodoItem } from "@/models/Todo";
import { X } from "lucide-react-native";
import { View } from "react-native";
import Animated, {
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";

type Props = {
  item: TodoItem;
  onRemove: (id: string) => void;
};

export function TodoItemRow({ item, onRemove }: Props) {
  return (
    <Animated.View
      entering={SlideInLeft.delay(300)}
      exiting={SlideOutRight}
      layout={LinearTransition}
    >
      <View className="flex-row items-center border border-border rounded-md p-3 bg-background">
        <Text className="flex-1 text-sm font-medium">{item.itemName}</Text>
        <Button variant="ghost" size="icon" onPress={() => onRemove(item.id)}>
          <X size={16} className="text-muted-foreground" />
        </Button>
      </View>
    </Animated.View>
  );
}

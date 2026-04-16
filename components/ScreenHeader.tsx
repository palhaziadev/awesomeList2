import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

type Props = {
  title: string;
};

export function ScreenHeader({ title }: Props) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-2 mb-1">
      <Pressable onPress={() => router.back()} className="pr-2">
        <Text className="text-primary text-base">←</Text>
      </Pressable>
      <Text className="text-xl font-semibold flex-1" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

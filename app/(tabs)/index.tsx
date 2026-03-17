import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 gap-4 p-4">
      <View className="flex-1">
        <Text className="text-sm font-medium leading-none">Index</Text>
      </View>
    </SafeAreaView>
  );
}

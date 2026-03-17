import * as Haptics from "expo-haptics";
import * as React from "react";

import { Text } from "@/components/ui/text";
import { Button, Platform, View } from "react-native";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabTwoScreen() {
  const { user, isLoading, signIn, signOut } = useAuth();
  const [state, setState] = React.useState({
    termsChecked: true,
    terms2Checked: true,
    toggleChecked: false,
    toggle2Checked: false,
  });

  function toggleCheckedState(key: keyof typeof state) {
    return () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setState((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    };
  }

  return (
    <SafeAreaView className="flex-1 gap-4 p-4">
      <View className="flex flex-row items-center gap-3">
        <Checkbox
          id="terms"
          checked={state.termsChecked}
          onCheckedChange={toggleCheckedState("termsChecked")}
        />
        <Label
          onPress={Platform.select({
            native: toggleCheckedState("termsChecked"),
          })}
          htmlFor="terms"
        >
          Accept terms and conditions
        </Label>
      </View>
      <View className="flex flex-row items-start gap-3">
        <Checkbox
          id="terms-2"
          checked={state.terms2Checked}
          onCheckedChange={toggleCheckedState("terms2Checked")}
        />
        <View className="flex-1 gap-2">
          <Label
            onPress={Platform.select({
              native: toggleCheckedState("terms2Checked"),
            })}
            htmlFor="terms-2"
          >
            Accept terms and conditions
          </Label>
          <Text className="text-muted-foreground text-sm">
            By clicking this checkbox, you agree to the terms and conditions.
          </Text>
        </View>
      </View>
      <View className="flex flex-row items-start gap-3">
        <Checkbox
          id="toggle"
          disabled
          checked={state.toggleChecked}
          onCheckedChange={toggleCheckedState("toggleChecked")}
        />
        <Label
          onPress={Platform.select({
            native: toggleCheckedState("toggleChecked"),
          })}
          htmlFor="toggle"
          disabled
        >
          Enable notifications
        </Label>
      </View>
      <Label
        onPress={Platform.select({
          native: toggleCheckedState("toggle2Checked"),
        })}
        htmlFor="toggle-2"
        className={cn(
          "web:hover:bg-accent/50 border-border flex flex-row rounded-lg border p-3",
          state.toggle2Checked &&
            "web:hover:bg-blue-50 border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950",
        )}
      >
        <View className="flex flex-1 flex-row items-start gap-3">
          <Checkbox
            id="toggle-2"
            checked={state.toggle2Checked}
            onCheckedChange={toggleCheckedState("toggle2Checked")}
            checkedClassName="border-blue-600 bg-blue-600 dark:border-blue-700"
            indicatorClassName="bg-blue-600 dark:bg-blue-700"
            iconClassName="text-white"
          />
          <View className="flex-1">
            <Text className="text-sm font-medium leading-none">
              Enable notifications
            </Text>
            <Text className="text-muted-foreground text-sm">
              You can enable or disable notifications at any time.{" "}
              {user?.email ?? "Not signed in"}
            </Text>
          </View>
        </View>
      </Label>
      <Button title="Google Sign-In" onPress={() => signIn()} />
      <View className="flex-1">
        <Text className="text-muted-foreground text-sm">
          {user?.email ? `Signed in as ${user.email}` : "Not signed in"}
        </Text>
      </View>
      {user && <Button title="Google Sign-Out" onPress={() => signOut()} />}
      <View className="flex-1">
        <Text className="text-muted-foreground text-sm">
          {isLoading ? "Loading..." : "not loading"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

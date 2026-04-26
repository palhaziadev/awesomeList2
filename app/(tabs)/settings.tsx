import * as React from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/auth-context";

export default function SettingsScreen() {
  const { user, signIn, signOut } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signIn();
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setLoading(true);
    try {
      await signOut();
    } catch {
      setError("Sign out failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 gap-4 p-4">
      <Text className="text-2xl font-bold text-center">Settings</Text>

      {user ? (
        <Button onPress={handleSignOut} disabled={loading} variant="outline">
          {loading ? <ActivityIndicator size="small" /> : <Text>Sign Out</Text>}
        </Button>
      ) : (
        <Button onPress={handleSignIn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text>Google Sign-In</Text>
          )}
        </Button>
      )}

      {error && (
        <Text className="text-destructive text-sm text-center">{error}</Text>
      )}

      <Text className="text-muted-foreground text-sm">
        {user?.email ? `Signed in as ${user.email}` : "Not signed in"}
      </Text>
    </SafeAreaView>
  );
}

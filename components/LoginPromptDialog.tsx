import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { usePathname, useRouter } from "expo-router";
import { useWindowDimensions } from "react-native";

type Props = {
  open: boolean;
};

export function LoginPromptDialog({ open }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isVisible = open && !pathname.includes("settings");

  return (
    <Dialog open={isVisible}>
      <DialogContent style={{ width: width - 32 }} hideCloseButton>
        <DialogHeader>
          <DialogTitle className="leading-normal">Not logged in</DialogTitle>
          <DialogDescription>Please login in settings!</DialogDescription>
        </DialogHeader>
        <Button onPress={() => router.push("/(tabs)/settings")}>
          <Text>Go to Settings</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Shop, TodoItem } from "@/models/Todo";
import * as React from "react";
import { View } from "react-native";

type Props = {
  item: TodoItem | null;
  shops: Shop[];
  onSave: (patch: { translationOverride: string | null; shopId: string | null }) => void;
  onClose: () => void;
};

export function EditItemDialog({ item, shops, onSave, onClose }: Props) {
  const [overrideText, setOverrideText] = React.useState(
    item?.translationOverride ?? "",
  );
  const [selectedShopId, setSelectedShopId] = React.useState<string | null>(
    item?.shopId ?? null,
  );

  React.useEffect(() => {
    setOverrideText(item?.translationOverride ?? "");
    setSelectedShopId(item?.shopId ?? null);
  }, [item?.id]);

  const selectedShop = shops.find((s) => s.shopId === selectedShopId);

  function handleSave() {
    onSave({
      translationOverride: overrideText.trim() || null,
      shopId: selectedShopId,
    });
    onClose();
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <View className="gap-1">
          <Text className="text-xs text-muted-foreground uppercase tracking-wide">Name</Text>
          <View className="rounded-md border border-border bg-muted px-3 py-2">
            <Text className="text-sm text-muted-foreground">{item?.itemName}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-muted-foreground uppercase tracking-wide">Translation</Text>
          <View className="rounded-md border border-border bg-muted px-3 py-2">
            <Text className="text-sm text-muted-foreground">{item?.translation ?? "—"}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-foreground uppercase tracking-wide">Translation Override</Text>
          <Input
            value={overrideText}
            onChangeText={setOverrideText}
            placeholder="Override translation..."
          />
        </View>

        <View className="gap-1">
          <Text className="text-xs text-foreground uppercase tracking-wide">Shop</Text>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between">
                <Text>{selectedShop?.shopName ?? "None"}</Text>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onPress={() => setSelectedShopId(null)}>
                <Text>None</Text>
              </DropdownMenuItem>
              {shops.map((shop) => (
                <DropdownMenuItem
                  key={shop.shopId}
                  onPress={() => setSelectedShopId(shop.shopId)}
                >
                  <Text>{shop.shopName}</Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSave}>
            <Text>Save</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { SHOP_COLORS } from "@/lib/constants";
import { Shop, TodoItem } from "@/models/Todo";
import * as React from "react";
import { useWindowDimensions, View } from "react-native";

type Props = {
  item: TodoItem | null;
  shops: Shop[];
  onSave: (patch: { translationOverride: string | null; shopId: string | null }) => void;
  onRename: (newName: string) => void;
  onClose: () => void;
};

export function EditItemDialog({ item, shops, onSave, onRename, onClose }: Props) {
  const { width } = useWindowDimensions();
  const [dropdownWidth, setDropdownWidth] = React.useState(0);
  const [nameText, setNameText] = React.useState(item?.itemName ?? "");
  const [overrideText, setOverrideText] = React.useState(
    item?.translationOverride ?? "",
  );
  const [selectedShopId, setSelectedShopId] = React.useState<string | null>(
    item?.shopId ?? null,
  );

  React.useEffect(() => {
    setNameText(item?.itemName ?? "");
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
      <DialogContent style={{ width: width - 32 }}>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <View className="gap-1">
          <Text className="text-xs text-foreground uppercase tracking-wide">Name</Text>
          <View className="flex-row gap-2 items-center">
            <Input
              className="flex-1"
              value={nameText}
              onChangeText={setNameText}
              placeholder="Item name..."
            />
            <Button
              onPress={() => { onRename(nameText); }}
              disabled={!nameText.trim() || nameText.trim() === item?.itemName}
            >
              <Text>Add</Text>
            </Button>
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
              <Button
                variant="outline"
                className="w-full justify-between"
                onLayout={(e) => setDropdownWidth(e.nativeEvent.layout.width)}
              >
                <Text>{selectedShop?.shopName ?? "None"}</Text>
                {selectedShop && (
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SHOP_COLORS[selectedShop.shopId] }}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ width: dropdownWidth }}>
              <DropdownMenuItem onPress={() => setSelectedShopId(null)} className="justify-between">
                <Text>None</Text>
              </DropdownMenuItem>
              {shops.map((shop) => (
                <DropdownMenuItem
                  key={shop.shopId}
                  onPress={() => setSelectedShopId(shop.shopId)}
                  className="justify-between"
                >
                  <Text>{shop.shopName}</Text>
                  {SHOP_COLORS[shop.shopId] && (
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SHOP_COLORS[shop.shopId] }}
                    />
                  )}
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ListFilter,
  X,
} from "lucide-react-native";
import * as React from "react";
import { Pressable, Text, View } from "react-native";

type Order = "asc" | "desc" | null;

type Props = {
  dateOrder?: Order;
  onDateOrderChange?: (order: "asc" | "desc") => void;
  alphaOrder?: Order;
  onAlphaOrderChange?: (order: "asc" | "desc") => void;
};

function OrderToggle({
  value,
  onChange,
}: {
  value?: Order;
  onChange?: (order: "asc" | "desc") => void;
}) {
  return (
    <View className="flex-row px-2 pb-1">
      <Pressable
        className="flex-1 items-center"
        onPress={() => onChange?.("asc")}
      >
        <ArrowUpNarrowWide
          size={20}
          className={value === "asc" ? "text-primary" : "text-muted-foreground"}
        />
      </Pressable>
      <Pressable
        className="flex-1 items-center"
        onPress={() => onChange?.("desc")}
      >
        <ArrowDownNarrowWide
          size={20}
          className={
            value === "desc" ? "text-primary" : "text-muted-foreground"
          }
        />
      </Pressable>
    </View>
  );
}

export function ItemListFilter({
  dateOrder,
  onDateOrderChange,
  alphaOrder,
  onAlphaOrderChange,
}: Props) {
  return (
    // TODO maybe use popover with toggles instead of dropdown menu
    <DropdownMenu>
      <DropdownMenuTrigger>
        <ListFilter size={20} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          {/* // TODO: Implement group by shop functionality */}
          <Text>Group by Shop</Text>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Order by Date</DropdownMenuLabel>
        <OrderToggle value={dateOrder} onChange={onDateOrderChange} />
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Order by Alphabet</DropdownMenuLabel>
        <OrderToggle value={alphaOrder} onChange={onAlphaOrderChange} />
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center">
          <X size={16} className="text-muted-foreground" />
          <Text className="text-muted-foreground text-sm">Close</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

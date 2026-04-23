import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ListFilter,
} from "lucide-react-native";
import { Text, View } from "react-native";

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
    <View className="flex-row gap-2">
      <Toggle
        pressed={value === "asc"}
        onPressedChange={() => onChange?.("asc")}
        variant="outline"
        size="sm"
        className="flex-1"
      >
        <ArrowUpNarrowWide
          size={18}
          className={value === "asc" ? "text-accent-foreground" : "text-muted-foreground"}
        />
      </Toggle>
      <Toggle
        pressed={value === "desc"}
        onPressedChange={() => onChange?.("desc")}
        variant="outline"
        size="sm"
        className="flex-1"
      >
        <ArrowDownNarrowWide
          size={18}
          className={value === "desc" ? "text-accent-foreground" : "text-muted-foreground"}
        />
      </Toggle>
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
    <Popover>
      <PopoverTrigger>
        <ListFilter size={20} className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3">
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Order by Date
            </Text>
            <OrderToggle value={dateOrder} onChange={onDateOrderChange} />
          </View>
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Order by Alphabet
            </Text>
            <OrderToggle value={alphaOrder} onChange={onAlphaOrderChange} />
          </View>
        </View>
      </PopoverContent>
    </Popover>
  );
}

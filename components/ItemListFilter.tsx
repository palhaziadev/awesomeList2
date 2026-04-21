import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Text } from "@/components/ui/text";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, ListFilter } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

export function ItemListFilter() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <ListFilter size={20} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white">
        <DropdownMenuItem>
          <Text>Group by Shop</Text>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Text>Order by Date</Text>
        </DropdownMenuItem>
        <View className="flex-row px-2 pb-1">
          <View className="flex-1 items-center">
            <ArrowUpNarrowWide size={20} className="text-muted-foreground" />
          </View>
          <View className="flex-1 items-center">
            <ArrowDownNarrowWide size={20} className="text-muted-foreground" />
          </View>
        </View>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Text>Order by Alphabet</Text>
        </DropdownMenuItem>
        <View className="flex-row px-2 pb-1">
          <View className="flex-1 items-center">
            <ArrowUpNarrowWide size={20} className="text-muted-foreground" />
          </View>
          <View className="flex-1 items-center">
            <ArrowDownNarrowWide size={20} className="text-muted-foreground" />
          </View>
        </View>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { supabase } from "@/lib/supabase.config";
import { Shop } from "@/models/Todo";
import * as React from "react";

export function useShops() {
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchShops() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("todo_list_shop")
        .select("id, shop_name");
      setIsLoading(false);
      if (error || !data) return;
      setShops(data.map((row) => ({ shopId: String(row.id), shopName: row.shop_name })));
    }
    fetchShops();
  }, []);

  return { shops, isLoading };
}

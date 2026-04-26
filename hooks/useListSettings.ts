import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

const STORAGE_KEY = "list_settings";

type Order = "asc" | "desc" | null;

interface ListSettings {
  groupbyIsDone: boolean;
  groupByShop: boolean;
  dateOrder: Order;
  alphaOrder: Order;
}

const defaults: ListSettings = {
  groupbyIsDone: true,
  groupByShop: false,
  dateOrder: "desc",
  alphaOrder: null,
};

export function useListSettings() {
  const [settings, setSettings] = React.useState<ListSettings>(defaults);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...defaults, ...JSON.parse(raw) });
        } catch {}
      }
      setIsLoaded(true);
    });
  }, []);

  const update = React.useCallback((patch: Partial<ListSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, isLoaded, update };
}

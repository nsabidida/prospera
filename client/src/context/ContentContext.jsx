import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const [content, setContent] = useState({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.content();
      setContent(data.content || {});
    } catch {
      // If this fails (offline, fresh install mid-migration, etc.) the app
      // still works — every call site supplies its own fallback text.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // t("dashboard.title", "Dashboard") -> content override, or the fallback.
  function t(key, fallback = "") {
    const value = content[key];
    return value === undefined || value === "" ? fallback : value;
  }

  return (
    <ContentContext.Provider value={{ t, content, loaded, refresh }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  return useContext(ContentContext);
}

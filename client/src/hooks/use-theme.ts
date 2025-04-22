import { useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { resolvedTheme, theme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    theme: mounted ? theme : "light",
    resolvedTheme: mounted ? resolvedTheme : "light",
    setTheme,
    mounted
  };
}

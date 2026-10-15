import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  // Show "Ljust"/"Mörkt" next to the icon (used in the mobile menu).
  withLabel?: boolean;
}

// Switches between the dark and light look. The icon shows the theme you'd
// switch *to*, like most sites do.
export function ThemeToggle({ className, withLabel = false }: ThemeToggleProps) {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? t("landing.theme.toLight") : t("landing.theme.toDark");

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-foreground/70 transition-colors hover:text-foreground",
        withLabel ? "h-11 rounded-full border border-border px-4" : "h-9 w-9 hover:bg-foreground/10",
        className
      )}
    >
      {next === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {withLabel && <span>{next === "light" ? t("landing.theme.light") : t("landing.theme.dark")}</span>}
    </button>
  );
}

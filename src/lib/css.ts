import type { CSSProperties } from "react";

/** Type-safe way to pass CSS custom properties through `style`. */
export const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

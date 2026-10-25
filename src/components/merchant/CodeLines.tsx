import type { ReactNode } from "react";
import { cssVars } from "@/lib/css";

const TOKEN = /(<\/?[a-zA-Z][a-zA-Z0-9]*|\/?>|"[^"]*"|[a-zA-Z-]+(?==)|\/\/.*$|\b(?:window|console|if)\b)/g;

/** Tiny HTML/JS highlighter. Enough for the embed snippets, no dependency. */
export function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    let cls = "text-ink-200";
    if (t.startsWith("<") || t === ">" || t === "/>") cls = "text-chalk-300";
    else if (t.startsWith('"')) cls = "text-thread-400";
    else if (t.startsWith("//")) cls = "text-ink-400";
    else if (/^(window|console|if)$/.test(t)) cls = "text-chalk-300";
    else cls = "text-ink-300";
    out.push(
      <span key={m.index} className={cls}>
        {t}
      </span>
    );
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

type Props = {
  lines: string[];
  /** Line numbers (0-based) to emphasise; others are dimmed. */
  hot?: number[];
  /** Drop lines in one after another (used when the snippet is "pasted"). */
  drop?: boolean;
  /** Seconds before the first line drops. */
  dropDelay?: number;
  /** Number shown in the gutter for the first line. */
  start?: number;
  className?: string;
};

export default function CodeLines({ lines, hot, drop, dropDelay = 0, start = 1, className = "" }: Props) {
  return (
    <pre
      className={`overflow-x-auto font-mono text-[11.5px] leading-[1.7] text-ink-100 ${className}`}
    >
      <code className="block min-w-max">
        {lines.map((line, i) => {
          const dim = hot && !hot.includes(i);
          return (
            <span
              key={i}
              data-dim={dim ? "true" : "false"}
              data-hot={hot?.includes(i) ? "true" : "false"}
              className={`code-line ${drop ? "code-drop" : ""}`}
              style={cssVars({ "--d": `${dropDelay + i * 0.16}s` })}
            >
              <span className="code-gutter" aria-hidden="true">
                {start + i}
              </span>
              {highlight(line)}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

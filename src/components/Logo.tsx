interface LogoProps {
  tone?: "dark" | "light";
  className?: string;
}

/** Wordmark: the "ON" is a switch in the on position. */
export default function Logo({ tone = "dark", className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center font-display text-[1.4rem] font-semibold tracking-tight ${
        tone === "dark" ? "text-ink-900" : "text-white"
      } ${className}`}
    >
      tryy
      <span className="ml-1 inline-flex h-[1.4rem] items-center gap-1 rounded-full bg-chalk-500 pl-2 pr-[3px] text-[0.72rem] font-bold leading-none tracking-wide text-white">
        ON
        <span className="h-[1.05rem] w-[1.05rem] rounded-full bg-white shadow-sm" />
      </span>
    </span>
  );
}

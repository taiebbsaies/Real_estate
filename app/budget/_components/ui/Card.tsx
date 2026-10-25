import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

export default function Card({
  children,
  className = "",
  padded = true,
}: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200/90 bg-white/90 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90${
        padded ? " p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

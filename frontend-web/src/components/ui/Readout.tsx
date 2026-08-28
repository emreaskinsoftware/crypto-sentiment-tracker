import { cn } from "@/lib/utils";

export interface ReadoutItem {
  label: string;
  value: string;
  note?: string;
  tone?: "ink" | "trace" | "trace-alt";
}

const toneClass = {
  ink: "text-ink",
  trace: "text-trace",
  "trace-alt": "text-trace-alt",
} as const;

/**
 * Ölçüm bandı. Kart yok, ikon yok — cihaz panelindeki gibi hairline ile
 * ayrılmış dört okuma.
 */
export function ReadoutBar({ items }: { items: ReadoutItem[] }) {
  return (
    <section className="grid grid-cols-2 border border-ink/15 bg-paper/80 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "feed-in px-4 py-3",
            // Hairline'lar yalnızca içeride; dış çerçeve kapsayıcıdan gelir
            i % 2 === 1 && "border-l border-ink/12",
            i >= 2 && "border-t border-ink/12",
            "lg:border-t-0 lg:border-l lg:first:border-l-0"
          )}
          style={{ animationDelay: `${i * 55}ms` }}
        >
          <p className="font-label text-[9px] font-600 uppercase tracking-[0.18em] text-ink-soft">
            {item.label}
          </p>
          <p
            className={cn(
              "font-data text-xl leading-tight tabular-nums mt-1",
              toneClass[item.tone ?? "ink"]
            )}
          >
            {item.value}
          </p>
          {item.note && (
            <p className="font-data text-[10px] text-ink-faint mt-0.5">
              {item.note}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

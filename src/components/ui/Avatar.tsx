import { initials } from "@/lib/names";

const PALETTE = [
  ["#2f6b2f", "#5fa052"],
  ["#1d4a2c", "#3d7c3a"],
  ["#6a4628", "#a86b33"],
  ["#7a5b14", "#b3872a"],
  ["#24524a", "#3f8a7a"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  url,
  size = 72,
  deceased = false,
  ring = true,
  className = "",
}: {
  name: string;
  url: string | null;
  size?: number;
  deceased?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const [a, b] = deceased ? ["#8a6a48", "#c19a6b"] : PALETTE[hash(name) % PALETTE.length];
  const ringCls = ring ? (deceased ? "ring-[3px] ring-dry/60" : "ring-[3px] ring-leaf-bright/70") : "";
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-white ${ringCls} ring-offset-2 ring-offset-white/70 ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Foto ${name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`h-full w-full object-cover object-[50%_28%] ${deceased ? "photo-dry" : ""}`}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-display text-white"
          style={{ background: `linear-gradient(145deg, ${a}, ${b})`, fontSize: size * 0.36 }}
          aria-label={`Inisial ${name}`}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}

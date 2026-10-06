import { TreeIllustration } from "@/components/ui/Ornaments";

export default function Loading() {
  return (
    <div className="islamic-pattern grid h-dvh place-items-center">
      <div className="text-center">
        <TreeIllustration className="mx-auto h-40 w-auto animate-pulse" />
        <p className="mt-4 font-display text-lg text-forest">Menumbuhkan pohon keluarga…</p>
      </div>
    </div>
  );
}

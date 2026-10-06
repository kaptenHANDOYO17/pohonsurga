"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImageOff, Loader2, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { removePhoto, uploadPhoto } from "./actions";

const MAX_SIDE = 900;

/** Perkecil & kompres foto di browser (hemat kuota, upload cepat di HP). */
async function compress(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name))
    throw new Error("Format harus JPG, PNG, atau WEBP.");
  if (file.size > 25 * 1024 * 1024) throw new Error("File terlalu besar (maks. 25 MB sebelum dikompres).");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Foto tidak bisa dibaca. Coba simpan ulang sebagai JPG lalu unggah lagi.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await toBlob("image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.85);
  if (!blob) throw new Error("Gagal memproses foto.");
  if (blob.size > 2 * 1024 * 1024) blob = (await toBlob("image/jpeg", 0.7)) ?? blob;
  return blob;
}

export default function PhotoUploader({
  memberId,
  name,
  currentUrl,
  deceased,
  onPending,
  onChanged,
}: {
  /** null = anggota baru (foto diunggah setelah data disimpan) */
  memberId: string | null;
  name: string;
  currentUrl: string | null;
  deceased: boolean;
  onPending?: (blob: Blob | null) => void;
  onChanged?: (msg: string, ok: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [busy, startBusy] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    startBusy(async () => {
      try {
        const blob = await compress(file);
        const url = URL.createObjectURL(blob);
        if (!memberId) {
          setPreview(url);
          onPending?.(blob);
          return;
        }
        const fd = new FormData();
        fd.append("memberId", memberId);
        fd.append("photo", blob, blob.type === "image/webp" ? "foto.webp" : "foto.jpg");
        const res = await uploadPhoto(fd);
        if (res.ok) {
          setPreview(url);
          onChanged?.(res.message ?? "Foto tersimpan.", true);
        } else {
          setErr(res.error);
          onChanged?.(res.error, false);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal memproses foto.");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  const remove = () => {
    if (!memberId) {
      setPreview(null);
      onPending?.(null);
      return;
    }
    if (!confirm(`Hapus foto ${name}?`)) return;
    startBusy(async () => {
      const res = await removePhoto(memberId);
      if (res.ok) {
        setPreview(null);
        onChanged?.("Foto dihapus.", true);
      } else setErr(res.error);
    });
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      className={`flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-5 transition sm:flex-row ${
        drag ? "border-leaf bg-leaf-pale" : "border-gold/40 bg-white/60"
      }`}
    >
      <div className="relative">
        <Avatar name={name || "?"} url={preview} size={112} deceased={deceased} />
        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
            <Loader2 className="h-7 w-7 animate-spin text-forest" />
          </div>
        )}
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="font-semibold text-forest">Foto profil (maksimal 1)</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          JPG / PNG / WEBP. Foto otomatis diperkecil &amp; dikompres. Foto baru menggantikan foto lama.
          {!memberId && " Foto akan diunggah setelah data disimpan."}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-parchment hover:bg-forest-deep disabled:opacity-60"
          >
            {preview ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {preview ? "Ganti foto" : "Unggah foto"}
          </button>
          {preview && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <ImageOff className="h-4 w-4" /> Hapus
            </button>
          )}
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

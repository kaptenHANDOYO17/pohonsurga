import { z } from "zod";

const clean = (s: string, keepNewlines = false) =>
  s.replace(keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "").trim();

const optText = (max: number, keepNewlines = false) =>
  z
    .string()
    .max(max * 2)
    .nullish()
    .transform((v) => (v ? clean(v, keepNewlines) : ""))
    .refine((v) => v.length <= max, { message: `Maksimal ${max} karakter` })
    .transform((v) => (v.length ? v : null));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Tanggal tidak valid")
  .refine((v) => v >= "1800-01-01" && v <= new Date().toISOString().slice(0, 10), "Tanggal di luar rentang wajar");

export const memberInputSchema = z
  .object({
    id: z.uuid().nullish(),
    full_name: z
      .string()
      .transform((v) => clean(v).replace(/\s+/g, " "))
      .pipe(z.string().min(2, "Nama lengkap minimal 2 huruf").max(120, "Nama terlalu panjang")),
    nickname: optText(40),
    gender: z.enum(["L", "P"]).nullish().transform((v) => v ?? null),
    birth_date: z
      .union([isoDate, z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v : null)),
    birth_year: z.number().int().min(1800).max(2200).nullish().transform((v) => v ?? null),
    domicile: optText(80),
    is_deceased: z.boolean(),
    bio: optText(1500, true),
    member_type: z.enum(["keturunan", "pasangan", "bawaan"]),
    parent_id: z.uuid().nullish().transform((v) => v ?? null),
    co_parent_id: z.uuid().nullish().transform((v) => v ?? null),
    birth_order: z.number().int().min(1).max(60).nullish().transform((v) => v ?? null),
    hafalan_juz: z.number().int().min(0).max(30).nullish().transform((v) => (v ? v : null)),
    spouse_of: z.uuid().nullish().transform((v) => v ?? null),
    marriage_order: z.number().int().min(1).max(10).nullish().transform((v) => v ?? null),
    marriage_status: z.enum(["menikah", "cerai", "wafat"]).nullish().transform((v) => v ?? null),
  })
  .superRefine((v, ctx) => {
    if (v.member_type === "pasangan" && !v.spouse_of)
      ctx.addIssue({ code: "custom", message: "Pilih anggota keluarga yang menjadi pasangannya", path: ["spouse_of"] });
    if (v.member_type === "bawaan" && !v.parent_id)
      ctx.addIssue({ code: "custom", message: "Pilih orang tua dari anak bawaan ini", path: ["parent_id"] });
    if (v.parent_id && v.parent_id === v.co_parent_id)
      ctx.addIssue({ code: "custom", message: "Orang tua dan pasangan orang tua tidak boleh orang yang sama", path: ["co_parent_id"] });
    if (v.id && (v.id === v.parent_id || v.id === v.co_parent_id || v.id === v.spouse_of))
      ctx.addIssue({ code: "custom", message: "Seseorang tidak bisa berelasi dengan dirinya sendiri", path: ["parent_id"] });
  });

export type MemberInput = z.input<typeof memberInputSchema>;

export const uuidSchema = z.uuid();

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Data tidak valid";
}

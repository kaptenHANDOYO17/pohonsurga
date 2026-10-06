import type { MetadataRoute } from "next";

// Situs keluarga bersifat privat: tolak semua mesin pencari.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}

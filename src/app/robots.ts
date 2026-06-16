import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** บอกบอทค้นหา: เก็บ index หน้าสาธารณะได้ · กันหน้าแอดมิน/API */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/settings"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

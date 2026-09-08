import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arabeiqrestaurant.com";

    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/order", "/delivery", "/book-table"],
                disallow: [
                    "/admin",
                    "/admin/*",
                    "/captain",
                    "/api/*",
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}

import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arabeiqrestaurant.com";
    const now = new Date();

    return [
        {
            url: `${siteUrl}/`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${siteUrl}/order`,
            lastModified: now,
            changeFrequency: "hourly",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/delivery`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/book-table`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.8,
        },
    ];
}

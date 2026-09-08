import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pre-Book a Table in Kadiri | Surya Family Restaurant AC Dining & Family Hall",
  description:
    "Reserve your table online at Surya Family Restaurant Kadiri (సూర్య ఫ్యామిలీ రెస్టారెంట్) with zero advance fee. Located opposite RTC Bus Stand on Bypass Road for comfortable AC Family Dining.",
  keywords: [
    "book table restaurant kadiri",
    "table reservation kadiri",
    "surya restaurant table booking",
    "family restaurant ac hall kadiri",
    "సూర్య ఫ్యామిలీ రెస్టారెంట్ కదిరి",
    "pre book table kadiri",
  ],
  alternates: {
    canonical: "/book-table",
  },
  openGraph: {
    title: "Pre-Book a Table in Kadiri — Surya Family Restaurant",
    description: "Zero-advance fee online table reservation for AC Family section.",
  },
};

export default function BookTableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Surya Family Restaurant Menu & Prices | Biryani, Curries, Tandoor & Butter Naan in Kadiri",
  description:
    "Explore the authentic food menu with prices at Surya Family Restaurant Kadiri (సూర్య ఫ్యామిలీ రెస్టారెంట్). Hyderabadi Chicken Dum Biryani, Punjabi Chicken Curry, Butter Naan, Tandoori Starters, Paneer Specials and Chinese. Order online or scan table QR code.",
  keywords: [
    "surya restaurant menu",
    "surya family restaurant kadiri menu",
    "సూర్య ఫ్యామిలీ రెస్టారెంట్ మెనూ",
    "biryani kadiri prices",
    "punjabi chicken curry kadiri",
    "butter naan kadiri",
    "tandoori chicken kadiri",
    "surya restaurant online order",
  ],
  openGraph: {
    title: "Surya Family Restaurant Menu & Prices - Kadiri",
    description: "Scan table QR or order online: Biryani, Punjabi Curries, Tandoor & Family Packs.",
    images: ["/logo.png"],
  },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

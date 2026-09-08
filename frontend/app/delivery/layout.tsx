import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Food Online in Kadiri | Surya Family Restaurant Takeaway & Doorstep Delivery",
  description:
    "Order hot and fresh Hyderabadi Dum Biryani, Punjabi Chicken Curry, Butter Naan, and Tandoori Starters online in Kadiri from Surya Family Restaurant (సూర్య ఫ్యామిలీ రెస్టారెంట్). Live order tracking.",
  keywords: [
    "order food online kadiri",
    "kadiri food delivery",
    "online biryani delivery kadiri",
    "surya restaurant kadiri delivery",
    "surya family restaurant online order",
    "best food delivery kadiri",
  ],
  alternates: {
    canonical: "/delivery",
  },
  openGraph: {
    title: "Order Food Online in Kadiri — Surya Family Restaurant",
    description: "Fast doorstep food delivery and quick parcel pickup across Kadiri town.",
  },
};

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

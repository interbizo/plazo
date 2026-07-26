import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Layanan",
  description: "Temukan jasa profesional dan freelancer di Plazo.",
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

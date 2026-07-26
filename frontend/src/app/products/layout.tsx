import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produk",
  description: "Jelajahi produk digital dan fisik di marketplace Plazo.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

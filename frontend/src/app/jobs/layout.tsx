import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lowongan",
  description: "Cari dan posting lowongan pekerjaan freelance di Plazo.",
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

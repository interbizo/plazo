import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifikasi Akun - Plazo Marketplace",
  description: "Pilih metode verifikasi untuk mengaktifkan akun Anda",
};

export default function VerifyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

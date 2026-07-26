import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Buat akun Plazo baru dan mulai berjualan atau berbelanja.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

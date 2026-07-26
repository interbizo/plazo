"use client";

import { useParams } from "next/navigation";
import { InternalProductForm } from "@/components/admin/internal-product-form";

export default function EditInternalProductPage() {
  const params = useParams();
  return <InternalProductForm mode="edit" productId={params.id as string} />;
}

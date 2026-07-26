"use client";

import { useParams } from "next/navigation";
import { InternalServiceForm } from "@/components/admin/internal-service-form";

export default function EditInternalServicePage() {
  const params = useParams();
  return <InternalServiceForm mode="edit" serviceId={params.id as string} />;
}

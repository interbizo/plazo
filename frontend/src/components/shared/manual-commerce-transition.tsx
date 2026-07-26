"use client";

import Link from "next/link";
import { MessageCircle, Phone, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionLink {
  href: string;
  label: string;
  variant?: "primary" | "outline";
  icon?: "chat" | "browse" | "whatsapp";
}

interface ManualCommerceTransitionProps {
  title: string;
  description: string;
  note?: string;
  actions: ActionLink[];
}

const ICONS = {
  chat: MessageCircle,
  browse: ShoppingBag,
  whatsapp: Phone,
};

export function ManualCommerceTransition({
  title,
  description,
  note,
  actions,
}: ManualCommerceTransitionProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 via-white to-blue-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <MessageCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          {description}
        </p>
        {note && (
          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-gray-600">
            {note}
          </div>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {actions.map((action) => {
            const Icon = action.icon ? ICONS[action.icon] : null;

            return (
              <Link key={action.href + action.label} href={action.href}>
                <Button
                  variant={action.variant === "outline" ? "outline" : "primary"}
                  size="lg"
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

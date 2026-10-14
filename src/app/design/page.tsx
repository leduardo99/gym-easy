import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignCatalog } from "@/components/app/design-catalog";
import { isDesignCatalogEnabled } from "@/lib/design-catalog";

export const metadata: Metadata = {
  title: "Design System · Gym Easy",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  if (!isDesignCatalogEnabled()) {
    notFound();
  }

  return <DesignCatalog />;
}

"use client";

import { Sidebar } from "@/components/layouts/sidebar";
import { useSession } from "next-auth/react";

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role || "ADMIN";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <main className="flex-1 lg:ml-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

import { Sidebar } from "@/components/layouts/sidebar";

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="DEALER" />
      <main className="flex-1 lg:ml-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

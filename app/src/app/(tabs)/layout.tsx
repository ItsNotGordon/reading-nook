import { BottomNav } from "@/components/BottomNav";
import { NotificationCountsProvider } from "@/components/NotificationCountsProvider";

export default function TabsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <NotificationCountsProvider>
      {children}
      <BottomNav />
    </NotificationCountsProvider>
  );
}

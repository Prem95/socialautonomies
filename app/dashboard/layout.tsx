import { DashboardLayout } from "@/components/dashboard/layout";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use the DashboardLayout component to wrap the children
  return <DashboardLayout>{children}</DashboardLayout>;
}
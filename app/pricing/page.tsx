import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { PricingTiers } from "@/components/pricing/pricing-tiers";

export default function PricingPage() {
  return (
    <DashboardShell>
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <DashboardHeader
          heading="Pricing"
          text="One Price for All Needs"
        />
        <PricingTiers />
      </div>
    </DashboardShell>
  );
}
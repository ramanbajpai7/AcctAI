import { DashboardOverview } from "@/components/dashboard/overview"

export default async function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Dashboard</h1>
      <DashboardOverview />
    </div>
  )
}

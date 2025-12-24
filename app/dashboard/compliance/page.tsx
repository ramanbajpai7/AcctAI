import { ComplianceCalendar } from "@/components/dashboard/compliance-calendar"

export default function CompliancePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Compliance Calendar</h1>
      <p className="text-muted-foreground mb-6">Track and manage compliance deadlines across all clients</p>
      <ComplianceCalendar />
    </div>
  )
}

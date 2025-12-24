import { ClientsList } from "@/components/dashboard/clients-list"

export default function ClientsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Clients</h1>
      </div>
      <ClientsList />
    </div>
  )
}

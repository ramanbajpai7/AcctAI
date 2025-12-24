import { WhatsAppMessenger } from "@/components/dashboard/whatsapp-messenger"

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">WhatsApp Messaging</h1>
        <p className="text-muted-foreground mt-1">
          Send compliance reminders and document requests via WhatsApp
        </p>
      </div>
      <WhatsAppMessenger />
    </div>
  )
}

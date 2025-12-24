import { EmailComposer } from "@/components/dashboard/email-composer"

export default function EmailDraftsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Email Drafts</h1>
        <p className="text-muted-foreground mt-1">
          Generate professional email templates for client communications
        </p>
      </div>
      <EmailComposer />
    </div>
  )
}

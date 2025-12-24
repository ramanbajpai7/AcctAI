// Email Draft Generation Service
// Auto-generate professional email templates for common accounting communications

export interface EmailDraft {
  subject: string
  body: string
  type: string
}

export type EmailTemplateType = 
  | 'gst_reminder'
  | 'itr_reminder'
  | 'tds_reminder'
  | 'document_request'
  | 'fee_reminder'
  | 'compliance_update'
  | 'meeting_request'
  | 'acknowledgment'
  | 'query_response'

interface EmailTemplateData {
  clientName: string
  accountantName: string
  firmName?: string
  // Specific fields based on template type
  dueDate?: string
  returnType?: string
  documentList?: string[]
  period?: string
  amount?: string
  meetingDate?: string
  meetingTime?: string
  queryTopic?: string
}

// Generate email draft based on template type
export function generateEmailDraft(
  templateType: EmailTemplateType,
  data: EmailTemplateData
): EmailDraft {
  const templates: Record<EmailTemplateType, () => EmailDraft> = {
    gst_reminder: () => ({
      type: 'gst_reminder',
      subject: `GST Return Filing Reminder - ${data.returnType || 'GSTR-3B'} for ${data.period || 'Current Month'}`,
      body: `Dear ${data.clientName},

This is a gentle reminder that the ${data.returnType || 'GSTR-3B'} filing for ${data.period || 'the current month'} is approaching.

**Due Date:** ${data.dueDate || 'As per schedule'}

To ensure timely filing, please:
1. Verify all sales and purchase invoices are recorded
2. Confirm ITC (Input Tax Credit) details
3. Review any pending reconciliation items

If you have any pending invoices or documents, kindly share them at your earliest convenience.

Please let us know if you need any assistance with the filing.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    itr_reminder: () => ({
      type: 'itr_reminder',
      subject: `Income Tax Return Filing Reminder - AY ${data.period || '2024-25'}`,
      body: `Dear ${data.clientName},

We would like to remind you about the upcoming Income Tax Return filing for Assessment Year ${data.period || '2024-25'}.

**Due Date:** ${data.dueDate || 'July 31, 2024'}

To proceed with the filing, we require the following documents:
${data.documentList?.map(d => `• ${d}`).join('\n') || '• Form 16/16A\n• Bank statements\n• Investment proofs (80C, 80D, etc.)\n• Rental income details (if any)\n• Capital gains statements (if any)'}

We recommend filing well before the due date to avoid any last-minute issues or penalties.

Please schedule a call or share the documents at your earliest convenience.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    tds_reminder: () => ({
      type: 'tds_reminder',
      subject: `TDS Payment & Return Filing Reminder - ${data.period || 'Current Quarter'}`,
      body: `Dear ${data.clientName},

This is a reminder regarding the TDS compliance for ${data.period || 'the current quarter'}.

**Key Deadlines:**
• TDS Payment: 7th of the following month
• TDS Return Filing: ${data.dueDate || 'As per schedule'}

Please ensure:
1. All TDS deductions are correctly calculated
2. TDS is deposited within the due date
3. Challans are properly recorded

If there are any pending payments or you need assistance with the return filing, please reach out.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    document_request: () => ({
      type: 'document_request',
      subject: `Document Request - ${data.period || 'Financial Year 2024-25'}`,
      body: `Dear ${data.clientName},

We hope this email finds you well.

For the ongoing compliance work for ${data.period || 'FY 2024-25'}, we require the following documents:

${data.documentList?.map((d, i) => `${i + 1}. ${d}`).join('\n') || '1. Bank statements\n2. Sales invoices\n3. Purchase invoices\n4. Payment vouchers'}

Kindly share these documents at your earliest convenience. You can:
• Email them directly to us
• Upload via our Client Portal
• Share via a secure cloud link

If you have any questions regarding the required documents, please feel free to reach out.

Thank you for your cooperation.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    fee_reminder: () => ({
      type: 'fee_reminder',
      subject: `Professional Fees Reminder - ${data.period || 'Outstanding Payment'}`,
      body: `Dear ${data.clientName},

We hope you are doing well.

This is a gentle reminder regarding the outstanding professional fees for our services.

**Amount Due:** ₹${data.amount || '[Amount]'}
**For Period:** ${data.period || 'As per our agreement'}

We would appreciate if you could arrange the payment at your earliest convenience. You can make the payment via:
• Bank transfer (details attached/as shared earlier)
• UPI payment
• Cheque

If you have already made the payment, please ignore this reminder and accept our thanks.

For any queries regarding the invoice, please don't hesitate to contact us.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    compliance_update: () => ({
      type: 'compliance_update',
      subject: `Compliance Status Update - ${data.period || 'Current Period'}`,
      body: `Dear ${data.clientName},

Please find below the compliance status update for your records:

**Period:** ${data.period || 'Current Financial Year'}

**Completed:**
• [List completed items]

**Pending:**
• [List pending items]

**Upcoming Deadlines:**
• [List upcoming deadlines]

We recommend reviewing the pending items and preparing accordingly. Please let us know if you need any clarification or have questions.

We are committed to ensuring your compliance is always up to date.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    meeting_request: () => ({
      type: 'meeting_request',
      subject: `Meeting Request - Review and Discussion`,
      body: `Dear ${data.clientName},

I hope this email finds you well.

I would like to schedule a meeting to discuss ${data.queryTopic || 'your financial matters and upcoming compliance requirements'}.

**Proposed Date:** ${data.meetingDate || '[Date]'}
**Proposed Time:** ${data.meetingTime || '[Time]'}
**Duration:** Approximately 30-45 minutes

The meeting can be conducted:
• In-person at our office
• Via video call (Zoom/Google Meet)
• Over phone

Please confirm your availability or suggest an alternative time that works better for you.

Looking forward to our discussion.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    acknowledgment: () => ({
      type: 'acknowledgment',
      subject: `Acknowledgment - Documents Received`,
      body: `Dear ${data.clientName},

Thank you for sharing the documents.

We have received the following:
${data.documentList?.map(d => `• ${d}`).join('\n') || '• Documents as shared'}

We will review them and proceed with the necessary filings/work. Should we require any additional information or clarification, we will reach out.

Expected completion: ${data.dueDate || 'Within the stipulated timeline'}

Thank you for your cooperation.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),

    query_response: () => ({
      type: 'query_response',
      subject: `Re: ${data.queryTopic || 'Your Query'}`,
      body: `Dear ${data.clientName},

Thank you for reaching out regarding ${data.queryTopic || 'your query'}.

[Your response here]

Please let us know if you need any further clarification or have additional questions.

Best regards,
${data.accountantName}
${data.firmName || ''}`,
    }),
  }
  
  return templates[templateType]()
}

// Get all available template types with descriptions
export function getEmailTemplateTypes(): { type: EmailTemplateType; label: string; description: string }[] {
  return [
    { type: 'gst_reminder', label: 'GST Filing Reminder', description: 'Remind clients about GST return filing' },
    { type: 'itr_reminder', label: 'ITR Filing Reminder', description: 'Income tax return filing reminder' },
    { type: 'tds_reminder', label: 'TDS Reminder', description: 'TDS payment and return filing reminder' },
    { type: 'document_request', label: 'Document Request', description: 'Request documents from clients' },
    { type: 'fee_reminder', label: 'Fee Reminder', description: 'Professional fees payment reminder' },
    { type: 'compliance_update', label: 'Compliance Update', description: 'Status update on compliance tasks' },
    { type: 'meeting_request', label: 'Meeting Request', description: 'Schedule a meeting with client' },
    { type: 'acknowledgment', label: 'Document Acknowledgment', description: 'Acknowledge receipt of documents' },
    { type: 'query_response', label: 'Query Response', description: 'Respond to client queries' },
  ]
}

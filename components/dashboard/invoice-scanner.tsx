"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Camera, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Edit,
  Save,
  X
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface InvoiceData {
  vendorName?: string
  vendorGstin?: string
  invoiceNumber?: string
  invoiceDate?: string
  totalAmount?: number
  subtotal?: number
  cgst?: number
  sgst?: number
  igst?: number
  confidence?: number
  rawText?: string
}

interface ValidationResult {
  isValid: boolean
  issues: string[]
  suggestions: string[]
}

export function InvoiceScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<InvoiceData | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(file: File) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image')
      return
    }

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    setIsScanning(true)
    setInvoiceData(null)
    setValidation(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/ocr/scan', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'OCR failed')
      }

      const result = await res.json()
      
      const data: InvoiceData = {
        vendorName: result.data.vendorName,
        vendorGstin: result.data.vendorGstin,
        invoiceNumber: result.data.invoiceNumber,
        invoiceDate: result.data.invoiceDate,
        totalAmount: result.data.totalAmount,
        subtotal: result.data.subtotal,
        cgst: result.data.cgst,
        sgst: result.data.sgst,
        igst: result.data.igst,
        confidence: result.data.confidence,
        rawText: result.data.rawText,
      }
      
      setInvoiceData(data)
      setEditedData(data)
      setValidation(result.validation)
      
      toast.success(`Invoice scanned in ${(result.meta.processingTime / 1000).toFixed(1)}s`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scan invoice')
    } finally {
      setIsScanning(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  function handleSave() {
    if (editedData) {
      setInvoiceData(editedData)
      setIsEditing(false)
      toast.success('Invoice data saved')
    }
  }

  function handleReset() {
    setInvoiceData(null)
    setValidation(null)
    setPreviewUrl(null)
    setIsEditing(false)
    setEditedData(null)
  }

  function formatCurrency(amount: number | undefined): string {
    if (!amount) return '—'
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!invoiceData && (
        <Card
          className={`p-12 border-2 border-dashed transition-colors cursor-pointer ${
            isScanning ? 'pointer-events-none opacity-60' : 'hover:border-blue-300 dark:hover:border-blue-700'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isScanning && fileInputRef.current?.click()}
        >
          <div className="text-center">
            {isScanning ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Scanning Invoice...</h3>
                <p className="text-muted-foreground">Extracting text with OCR, this may take a moment</p>
              </>
            ) : (
              <>
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Scan Invoice</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a photo or scan of your invoice to automatically extract data
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Upload size={18} />
                  <span className="ml-2">Choose Image</span>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">Supports JPG, PNG, WebP (max 10MB)</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </Card>
      )}

      {/* Results */}
      {invoiceData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Invoice Preview</h3>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <X size={14} className="mr-1" />
                Scan New
              </Button>
            </div>
            {previewUrl && (
              <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Invoice preview" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {invoiceData.confidence && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">OCR Confidence:</span>
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-full rounded-full ${
                      invoiceData.confidence > 80 ? 'bg-green-500' :
                      invoiceData.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${invoiceData.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{invoiceData.confidence.toFixed(0)}%</span>
              </div>
            )}
          </Card>

          {/* Extracted Data */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText size={18} />
                Extracted Data
              </h3>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    <Save size={14} className="mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </div>

            {/* Validation Status */}
            {validation && (
              <div className={`p-3 rounded-lg mb-4 ${
                validation.isValid 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {validation.isValid ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <AlertCircle size={16} className="text-yellow-600" />
                  )}
                  <span className="font-medium text-sm">
                    {validation.isValid ? 'Valid Invoice' : 'Review Required'}
                  </span>
                </div>
                {validation.issues.length > 0 && (
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 ml-6 list-disc">
                    {validation.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
                {validation.suggestions.length > 0 && (
                  <ul className="text-xs text-muted-foreground ml-6 mt-1 list-disc">
                    {validation.suggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Data Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vendor Name</Label>
                  {isEditing ? (
                    <Input 
                      value={editedData?.vendorName || ''} 
                      onChange={(e) => setEditedData({...editedData!, vendorName: e.target.value})}
                    />
                  ) : (
                    <p className="font-medium">{invoiceData.vendorName || '—'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vendor GSTIN</Label>
                  {isEditing ? (
                    <Input 
                      value={editedData?.vendorGstin || ''} 
                      onChange={(e) => setEditedData({...editedData!, vendorGstin: e.target.value.toUpperCase()})}
                    />
                  ) : (
                    <p className="font-medium font-mono text-sm">{invoiceData.vendorGstin || '—'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                  {isEditing ? (
                    <Input 
                      value={editedData?.invoiceNumber || ''} 
                      onChange={(e) => setEditedData({...editedData!, invoiceNumber: e.target.value})}
                    />
                  ) : (
                    <p className="font-medium">{invoiceData.invoiceNumber || '—'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Invoice Date</Label>
                  {isEditing ? (
                    <Input 
                      type="date"
                      value={editedData?.invoiceDate ? format(new Date(editedData.invoiceDate), 'yyyy-MM-dd') : ''}
                      onChange={(e) => setEditedData({...editedData!, invoiceDate: e.target.value})}
                    />
                  ) : (
                    <p className="font-medium">
                      {invoiceData.invoiceDate 
                        ? format(new Date(invoiceData.invoiceDate), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  )}
                </div>
              </div>

              <hr className="border-border" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Subtotal</Label>
                  {isEditing ? (
                    <Input 
                      type="number"
                      value={editedData?.subtotal || ''} 
                      onChange={(e) => setEditedData({...editedData!, subtotal: parseFloat(e.target.value)})}
                    />
                  ) : (
                    <p className="font-medium">{formatCurrency(invoiceData.subtotal)}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CGST</Label>
                  {isEditing ? (
                    <Input 
                      type="number"
                      value={editedData?.cgst || ''} 
                      onChange={(e) => setEditedData({...editedData!, cgst: parseFloat(e.target.value)})}
                    />
                  ) : (
                    <p className="font-medium">{formatCurrency(invoiceData.cgst)}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">SGST</Label>
                  {isEditing ? (
                    <Input 
                      type="number"
                      value={editedData?.sgst || ''} 
                      onChange={(e) => setEditedData({...editedData!, sgst: parseFloat(e.target.value)})}
                    />
                  ) : (
                    <p className="font-medium">{formatCurrency(invoiceData.sgst)}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">IGST</Label>
                  {isEditing ? (
                    <Input 
                      type="number"
                      value={editedData?.igst || ''} 
                      onChange={(e) => setEditedData({...editedData!, igst: parseFloat(e.target.value)})}
                    />
                  ) : (
                    <p className="font-medium">{formatCurrency(invoiceData.igst)}</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Total Amount</Label>
                  {isEditing ? (
                    <Input 
                      type="number"
                      className="w-40 text-right"
                      value={editedData?.totalAmount || ''} 
                      onChange={(e) => setEditedData({...editedData!, totalAmount: parseFloat(e.target.value)})}
                    />
                  ) : (
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(invoiceData.totalAmount)}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Create Transaction
                </Button>
                <Button variant="outline" className="flex-1">
                  Save as Draft
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

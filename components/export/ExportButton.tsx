'use client'

import { Download, FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  projectId: string
  categories?: Array<{ id: string; name: string }>
}

export function ExportButton({ projectId, categories = [] }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [exportScope, setExportScope] = useState<'all' | 'category'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setExporting(true)

      const body: any = { projectId }
      if (exportScope === 'category' && selectedCategoryId) {
        body.categoryId = selectedCategoryId
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const { pdf, filename } = await response.json()

      // Convert base64 to blob and download
      const base64Data = pdf.split(',')[1]
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export successful',
        description: 'Your PDF has been downloaded.',
      })

      setOpen(false)
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <FileDown className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle>Export to PDF</DialogTitle>
          </div>
          <DialogDescription className="pt-2 pl-[52px]">
            Choose what to include in your PDF export. Photos will be displayed at 70mm width for
            optimal printing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={exportScope}
            onValueChange={(value: string) => setExportScope(value as 'all' | 'category')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">Export all categories</Label>
            </div>
            {categories.length > 0 && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="category" />
                <Label htmlFor="category">Export specific category</Label>
              </div>
            )}
          </RadioGroup>

          {exportScope === 'category' && categories.length > 0 && (
            <div className="space-y-2">
              <Label>Select category</Label>
              <RadioGroup value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                {categories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={category.id} id={category.id} />
                    <Label htmlFor={category.id}>{category.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exporting}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || (exportScope === 'category' && !selectedCategoryId)}
            className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 border-green-600 dark:border-green-700"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { FenceType, PaymentMethod, ProjectStatus } from '@fencetastic/shared';
import type { RateTemplate } from '@fencetastic/shared';
import { useRateTemplates } from '@/hooks/use-rate-templates';

interface CreateProjectDialogProps {
  onCreated: () => void;
}

export function CreateProjectDialog({ onCreated }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { templates } = useRateTemplates();

  // Form state
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [fenceType, setFenceType] = useState<string>(FenceType.WOOD);
  const [status, setStatus] = useState<string>(ProjectStatus.ESTIMATE);
  const [projectTotal, setProjectTotal] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentMethod.CHECK);
  const [materialsCost, setMaterialsCost] = useState('');
  const [forecastedExpenses, setForecastedExpenses] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [estimateDate, setEstimateDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [linearFeet, setLinearFeet] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subcontractor, setSubcontractor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function resetForm() {
    setCustomer('');
    setAddress('');
    setDescription('');
    setFenceType(FenceType.WOOD);
    setStatus(ProjectStatus.ESTIMATE);
    setProjectTotal('');
    setPaymentMethod(PaymentMethod.CHECK);
    setMaterialsCost('');
    setForecastedExpenses('');
    setContractDate('');
    setInstallDate('');
    setEstimateDate('');
    setFollowUpDate('');
    setLinearFeet('');
    setSelectedTemplateId('');
    setSubcontractor('');
    setNotes('');
    setError('');
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    if (templateId === 'NONE') return;
    const template = templates.find((t: RateTemplate) => t.id === templateId);
    if (!template || !linearFeet) return;
    const feet = parseFloat(linearFeet);
    if (isNaN(feet)) return;
    setMaterialsCost((template.ratePerFoot * feet).toFixed(2));
    setForecastedExpenses(
      ((template.ratePerFoot + template.laborRatePerFoot) * feet).toFixed(2)
    );
    setFenceType(template.fenceType);
  }

  function handleLinearFeetChange(value: string) {
    setLinearFeet(value);
    if (selectedTemplateId && selectedTemplateId !== 'NONE') {
      const template = templates.find((t: RateTemplate) => t.id === selectedTemplateId);
      const feet = parseFloat(value);
      if (template && !isNaN(feet)) {
        setMaterialsCost((template.ratePerFoot * feet).toFixed(2));
        setForecastedExpenses(
          ((template.ratePerFoot + template.laborRatePerFoot) * feet).toFixed(2)
        );
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/projects', {
        customer,
        address,
        description,
        fenceType,
        status,
        projectTotal: parseFloat(projectTotal),
        paymentMethod,
        materialsCost: parseFloat(materialsCost) || 0,
        forecastedExpenses: parseFloat(forecastedExpenses) || 0,
        contractDate,
        installDate,
        estimateDate: estimateDate || null,
        followUpDate: followUpDate || null,
        linearFeet: linearFeet ? parseFloat(linearFeet) : null,
        rateTemplateId: selectedTemplateId && selectedTemplateId !== 'NONE' ? selectedTemplateId : null,
        subcontractor: subcontractor || null,
        notes: notes || null,
      });
      setOpen(false);
      resetForm();
      onCreated();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Failed to create project');
      } else {
        setError('Failed to create project');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Customer & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={2} />
            </div>

            {/* Fence Type, Status, Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fence Type *</Label>
                <Select value={fenceType} onValueChange={setFenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(FenceType).map((t) => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjectStatus).map((s) => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PaymentMethod).map((p) => (
                      <SelectItem key={p} value={p}>{p.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rate Template + Linear Feet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No template</SelectItem>
                    {templates.map((t: RateTemplate) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} (${t.ratePerFoot}/ft)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linearFeet">Linear Feet</Label>
                <Input id="linearFeet" type="number" step="0.01" value={linearFeet} onChange={(e) => handleLinearFeetChange(e.target.value)} />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectTotal">Project Total *</Label>
                <Input id="projectTotal" type="number" step="0.01" min="0" value={projectTotal} onChange={(e) => setProjectTotal(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialsCost">Materials Cost *</Label>
                <Input id="materialsCost" type="number" step="0.01" min="0" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forecastedExpenses">Forecasted Expenses *</Label>
                <Input id="forecastedExpenses" type="number" step="0.01" min="0" value={forecastedExpenses} onChange={(e) => setForecastedExpenses(e.target.value)} required />
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractDate">Contract Date *</Label>
                <Input id="contractDate" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installDate">Install Date *</Label>
                <Input id="installDate" type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimateDate">Estimate Date</Label>
                <Input id="estimateDate" type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-Up Date</Label>
                <Input id="followUpDate" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
            </div>

            {/* Subcontractor & Notes */}
            <div className="space-y-2">
              <Label htmlFor="subcontractor">Subcontractor</Label>
              <Input id="subcontractor" value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90">
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

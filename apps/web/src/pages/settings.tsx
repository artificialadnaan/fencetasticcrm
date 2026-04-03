import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon } from 'lucide-react';
import { ADNAAN_COMMISSION_RATE, MEME_COMMISSION_RATE, AIMANN_DEDUCTION_RATE } from '@fencetastic/shared';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Rate templates, operating expenses, and commission rates.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Commission Rates</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Adnaan</p>
              <p className="text-2xl font-bold">{(ADNAAN_COMMISSION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of project total</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Meme</p>
              <p className="text-2xl font-bold">{(MEME_COMMISSION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of project total</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Aimann Deduction</p>
              <p className="text-2xl font-bold">{(AIMANN_DEDUCTION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of gross profit (when debt &gt; 0)</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {['Rate Templates', 'Operating Expenses'].map((section) => (
          <Card key={section} className="border-dashed">
            <CardHeader><CardTitle className="text-lg">{section}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <SettingsIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <Badge variant="secondary">Phase 7</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

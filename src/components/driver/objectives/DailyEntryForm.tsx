import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DriverPlatform, DriverDailyEntry } from './types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Save, 
  RefreshCw, 
  TrendingUp, 
  Car, 
  Users, 
  Clock, 
  MapPin,
  Loader2,
  Sparkles,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyEntryFormProps {
  driverId: string;
  platforms: DriverPlatform[];
  onSubmit: (entry: Partial<DriverDailyEntry> & { entry_date: string }) => Promise<any>;
  onSyncSoloCab: (date: Date) => Promise<void>;
  fetchSoloCabStats: (date: Date) => Promise<any>;
}

export function DailyEntryForm({ 
  driverId, 
  platforms, 
  onSubmit, 
  onSyncSoloCab,
  fetchSoloCabStats 
}: DailyEntryFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState<string>('solocab');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [soloCabStats, setSoloCabStats] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    revenue: 0,
    courses_count: 0,
    new_clients_count: 0,
    hours_worked: 0,
    km_driven: 0,
    notes: '',
  });

  // Fetch SoloCab stats when date changes
  useEffect(() => {
    if (selectedPlatform === 'solocab') {
      loadSoloCabStats();
    }
  }, [selectedDate, selectedPlatform]);

  const loadSoloCabStats = async () => {
    const stats = await fetchSoloCabStats(selectedDate);
    if (stats) {
      setSoloCabStats(stats);
      setFormData({
        revenue: stats.revenue || 0,
        courses_count: stats.courses_count || 0,
        new_clients_count: stats.new_clients_count || 0,
        hours_worked: stats.hours_worked || 0,
        km_driven: stats.km_driven || 0,
        notes: '',
      });
    }
  };

  const handleSyncSoloCab = async () => {
    setSyncing(true);
    try {
      await onSyncSoloCab(selectedDate);
      await loadSoloCabStats();
      toast.success('Données SoloCab synchronisées');
    } catch (error) {
      toast.error('Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        entry_date: format(selectedDate, 'yyyy-MM-dd'),
        platform_id: selectedPlatform === 'solocab' ? null : selectedPlatform,
        is_solocab: selectedPlatform === 'solocab',
        revenue: formData.revenue,
        courses_count: formData.courses_count,
        new_clients_count: formData.new_clients_count,
        hours_worked: formData.hours_worked,
        km_driven: formData.km_driven,
        notes: formData.notes || null,
      });
      toast.success('Données enregistrées');
      
      // Reset for external platforms
      if (selectedPlatform !== 'solocab') {
        setFormData({
          revenue: 0,
          courses_count: 0,
          new_clients_count: 0,
          hours_worked: 0,
          km_driven: 0,
          notes: '',
        });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handlePlatformChange = (value: string) => {
    setSelectedPlatform(value);
    if (value !== 'solocab') {
      setFormData({
        revenue: 0,
        courses_count: 0,
        new_clients_count: 0,
        hours_worked: 0,
        km_driven: 0,
        notes: '',
      });
    } else {
      loadSoloCabStats();
    }
  };

  return (
    <div className="space-y-4">
      {/* Date and Platform Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Saisie des performances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Plateforme</Label>
              <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une plateforme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solocab">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      SoloCab (auto)
                    </div>
                  </SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.platform_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SoloCab Auto-sync Banner */}
          {selectedPlatform === 'solocab' && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm">Données SoloCab récupérées automatiquement</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncSoloCab}
                disabled={syncing}
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Entry Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selectedPlatform === 'solocab' 
              ? 'Données SoloCab' 
              : platforms.find(p => p.id === selectedPlatform)?.platform_name || 'Données'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                CA (€)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.revenue}
                onChange={(e) => setFormData(prev => ({ ...prev, revenue: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            {/* Courses */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-blue-500" />
                Courses
              </Label>
              <Input
                type="number"
                value={formData.courses_count}
                onChange={(e) => setFormData(prev => ({ ...prev, courses_count: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            {/* New Clients */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-500" />
                Nvx clients
              </Label>
              <Input
                type="number"
                value={formData.new_clients_count}
                onChange={(e) => setFormData(prev => ({ ...prev, new_clients_count: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-orange-500" />
                Heures
              </Label>
              <Input
                type="number"
                step="0.5"
                value={formData.hours_worked}
                onChange={(e) => setFormData(prev => ({ ...prev, hours_worked: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            {/* KM */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500" />
                Km
              </Label>
              <Input
                type="number"
                value={formData.km_driven}
                onChange={(e) => setFormData(prev => ({ ...prev, km_driven: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Remarques sur cette journée..."
              rows={2}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      {platforms.length === 0 && selectedPlatform !== 'solocab' && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600">
              💡 Ajoutez vos plateformes externes (Uber, Bolt...) dans l'onglet "Plateformes" pour saisir vos revenus.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

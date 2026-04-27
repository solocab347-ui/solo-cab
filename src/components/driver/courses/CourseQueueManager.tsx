import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  AlertTriangle, 
  Share2, 
  CheckCircle, 
  RefreshCw,
  MapPin,
  Users,
  Calendar,
  Loader2,
  User,
  ArrowRight,
  Timer,
  Zap
} from 'lucide-react';
import { useCourseQueue, QueuedCourse } from '@/hooks/useCourseQueue';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDriverPartners } from '@/hooks/useDriverPartners';

interface CourseQueueManagerProps {
  driverId: string | null;
}

export function CourseQueueManager({ driverId }: CourseQueueManagerProps) {
  const { 
    queue, 
    loading, 
    refreshing,
    refresh, 
    forceAcceptCourse, 
    shareWithPartner,
    returnToFleetManager,
    checkAutoPlace 
  } = useCourseQueue({ driverId });
  
  const { partners } = useDriverPartners(driverId);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueuedCourse | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(15 * 60); // 15 minutes in seconds

  // Countdown timer for next auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          return 15 * 60; // Reset to 15 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleForceAccept = async (item: QueuedCourse) => {
    setProcessingId(item.id);
    await forceAcceptCourse(item.id, item.course_id);
    setProcessingId(null);
  };

  const handleShareWithPartner = async (partnerId: string) => {
    if (!selectedQueueItem) return;
    setProcessingId(selectedQueueItem.id);
    await shareWithPartner(selectedQueueItem.id, selectedQueueItem.course_id, partnerId);
    setProcessingId(null);
    setShareDialogOpen(false);
    setSelectedQueueItem(null);
  };

  const handleReturn = async (item: QueuedCourse) => {
    setProcessingId(item.id);
    await returnToFleetManager(item.id, item.course_id);
    setProcessingId(null);
  };

  const openShareDialog = (item: QueuedCourse) => {
    setSelectedQueueItem(item);
    setShareDialogOpen(true);
  };

  const getClientName = (item: QueuedCourse): string => {
    if (item.course?.guest_name) {
      return item.course.guest_name;
    }
    if (item.course?.clients?.profiles?.full_name) {
      return item.course.clients.profiles.full_name;
    }
    return 'Client';
  };

  const getPrice = (item: QueuedCourse): number => {
    return item.course?.devis?.[0]?.amount || 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-success mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune course en attente</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Toutes vos courses sont correctement planifiées dans votre agenda.
            Les courses avec des conflits de timing apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">File d'attente intelligente</h3>
          <Badge variant="secondary" className="bg-warning/20 text-warning">
            {queue.length} course{queue.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Prochain rafraîchissement: <span className="font-mono">{formatCountdown(nextRefreshIn)}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              checkAutoPlace();
              setNextRefreshIn(15 * 60); // Reset timer on manual refresh
            }}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Vérifier</span>
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Zap className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Ces courses ne rentrent pas dans votre buffer minimum entre courses. 
          Vous pouvez les <strong>forcer</strong> dans votre planning ou les <strong>partager</strong> avec un partenaire de confiance.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {queue.map((item) => (
          <Card key={item.id} className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getClientName(item)}</span>
                    {item.source_type === 'fleet_manager' && (
                      <Badge variant="outline" className="text-xs">
                        Gestionnaire
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {item.course?.scheduled_date && format(new Date(item.course.scheduled_date), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {getPrice(item).toFixed(2)}€
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Expire {formatDistanceToNow(new Date(item.expires_at), { locale: fr, addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Addresses */}
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{item.course?.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{item.course?.destination_address}</span>
                </div>
              </div>

              {/* Conflict info */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/20 text-warning-foreground text-sm">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span>
                  Buffer insuffisant: <strong>{item.actual_gap_minutes || 0} min</strong> 
                  {' '}(minimum requis: <strong>{item.buffer_minutes_needed || 60} min</strong>)
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleForceAccept(item)}
                  disabled={processingId === item.id}
                >
                  {processingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Forcer l'acceptation
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => openShareDialog(item)}
                  disabled={processingId === item.id || partners.length === 0}
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>

                {item.source_type === 'fleet_manager' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground"
                    onClick={() => handleReturn(item)}
                    disabled={processingId === item.id}
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline">Retourner</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Partager avec un partenaire
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le partenaire de confiance qui prendra cette course
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {partners.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Vous n'avez pas encore de partenaires. 
                    Ajoutez des partenaires pour pouvoir partager vos courses.
                  </AlertDescription>
                </Alert>
              ) : (
                partners.map((partner) => (
                  <Button
                    key={partner.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => handleShareWithPartner(partner.id)}
                    disabled={processingId !== null}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{partner.full_name ?? 'Chauffeur'}</p>
                      <p className="text-xs text-muted-foreground">
                        Commission: 20% (modifiable jusqu'à 25%)
                      </p>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

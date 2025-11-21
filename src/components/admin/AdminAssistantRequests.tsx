import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AssistantRequest {
  id: string;
  driver_id: string;
  question: string;
  context: string | null;
  status: 'pending' | 'answered' | 'closed';
  admin_response: string | null;
  admin_id: string | null;
  created_at: string;
  answered_at: string | null;
  driver: {
    user_id: string;
    profiles: {
      full_name: string;
      email: string;
      profile_photo_url: string | null;
    };
  };
}

export const AdminAssistantRequests = () => {
  const [requests, setRequests] = useState<AssistantRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AssistantRequest | null>(null);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from('assistant_requests')
        .select(`
          *,
          driver:drivers!driver_id(
            user_id,
            profiles:profiles!drivers_user_id_fkey(
              full_name,
              email,
              profile_photo_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRequests((data || []) as AssistantRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes d'assistance.",
        variant: "destructive",
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedRequest || !response.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Mettre à jour la demande
      const { error: updateError } = await supabase
        .from('assistant_requests')
        .update({
          admin_response: response.trim(),
          admin_id: user.id,
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Créer une notification pour le chauffeur
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedRequest.driver.user_id,
          type: 'assistant_response',
          title: 'Réponse de l\'équipe administrative',
          message: `L'admin a répondu à votre question : "${selectedRequest.question.substring(0, 50)}..."`,
          link: '/driver-dashboard'
        });

      if (notifError) throw notifError;

      toast({
        title: "Réponse envoyée",
        description: "Le chauffeur a été notifié de votre réponse.",
      });

      setResponse('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('assistant_requests')
        .update({ status: 'closed' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Demande clôturée",
        description: "La demande a été marquée comme clôturée.",
      });

      fetchRequests();
    } catch (error) {
      console.error('Error closing request:', error);
      toast({
        title: "Erreur",
        description: "Impossible de clôturer la demande.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'answered':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Répondu</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50"><XCircle className="h-3 w-3 mr-1" />Clôturé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Liste des demandes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Demandes d'assistance Liberty
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                En attente
              </Button>
              <Button
                variant={filter === 'answered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('answered')}
              >
                Répondues
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Toutes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune demande d'assistance
                </div>
              ) : (
                requests.map((request) => (
                  <Card
                    key={request.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            {request.driver.profiles.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{request.driver.profiles.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm line-clamp-2">{request.question}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Détails et réponse */}
      <Card>
        <CardHeader>
          <CardTitle>Répondre à la demande</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedRequest ? (
            <div className="text-center py-12 text-muted-foreground">
              Sélectionnez une demande pour y répondre
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Chauffeur</h4>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <p className="text-sm">{selectedRequest.driver.profiles.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedRequest.driver.profiles.email}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Question</h4>
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.question}</p>
                  </CardContent>
                </Card>
              </div>

              {selectedRequest.admin_response && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Réponse envoyée</h4>
                  <Card className="bg-green-50">
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{selectedRequest.admin_response}</p>
                      {selectedRequest.answered_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(selectedRequest.answered_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Votre réponse</h4>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Rédigez votre réponse au chauffeur..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendResponse}
                      disabled={isLoading || !response.trim()}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer la réponse
                    </Button>
                    <Button
                      onClick={() => handleCloseRequest(selectedRequest.id)}
                      variant="outline"
                    >
                      Clôturer
                    </Button>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'answered' && (
                <Button
                  onClick={() => handleCloseRequest(selectedRequest.id)}
                  variant="outline"
                  className="w-full"
                >
                  Clôturer la demande
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Euro, 
  Handshake,
  Car,
  Download,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generatePartnerOrderDocumentPDF } from '../partnership/PartnerOrderDocumentPDF';

interface Props {
  driverId: string;
  limit?: number;
}

interface PartnerOrderDocument {
  id: string;
  document_number: string;
  shared_course_id: string;
  course_id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  distance_km: number | null;
  passengers_count: number;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  receiver_earnings: number;
  payment_method_used: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  // Sender info
  sender_driver_id: string;
  sender_name: string;
  sender_company: string | null;
  sender_siret: string | null;
  sender_phone: string | null;
  sender_sharing_number: number | null;
  sender_photo: string | null;
  // Receiver info
  receiver_driver_id: string;
  receiver_name: string;
  receiver_company: string | null;
  receiver_siret: string | null;
  receiver_phone: string | null;
  receiver_sharing_number: number | null;
  receiver_photo: string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'CB',
  cash: 'Espèces',
  transfer: 'Virement',
};

export function CompletedPartnerCoursesList({ driverId, limit = 10 }: Props) {
  const [documents, setDocuments] = useState<PartnerOrderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driverId) {
      loadDocuments();
    }
  }, [driverId]);

  const loadDocuments = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('partner_order_documents')
        .select('*')
        .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('Error fetching partner order documents:', fetchError);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      // Enrich with driver info
      const enrichedDocs: PartnerOrderDocument[] = [];
      
      for (const doc of data) {
        try {
          // Validate required fields exist
          if (!doc.sender_driver_id || !doc.receiver_driver_id) {
            console.warn('Document missing driver IDs:', doc.id);
            continue;
          }

          // Get sender info
          const { data: senderDriver } = await supabase
            .from('drivers')
            .select('user_id, company_name, siret, sharing_number, card_photo_url')
            .eq('id', doc.sender_driver_id)
            .single();

          let senderProfile: { full_name?: string; phone?: string; profile_photo_url?: string } | null = null;
          if (senderDriver?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone, profile_photo_url')
              .eq('id', senderDriver.user_id)
              .single();
            senderProfile = profile;
          }

          // Get receiver info
          const { data: receiverDriver } = await supabase
            .from('drivers')
            .select('user_id, company_name, siret, sharing_number, card_photo_url')
            .eq('id', doc.receiver_driver_id)
            .single();

          let receiverProfile: { full_name?: string; phone?: string; profile_photo_url?: string } | null = null;
          if (receiverDriver?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone, profile_photo_url')
              .eq('id', receiverDriver.user_id)
              .single();
            receiverProfile = profile;
          }

          enrichedDocs.push({
            ...doc,
            sender_name: senderProfile?.full_name || 'Partenaire',
            sender_company: senderDriver?.company_name || null,
            sender_siret: senderDriver?.siret || null,
            sender_phone: senderProfile?.phone || null,
            sender_sharing_number: senderDriver?.sharing_number || null,
            sender_photo: senderDriver?.card_photo_url || senderProfile?.profile_photo_url || null,
            receiver_name: receiverProfile?.full_name || 'Partenaire',
            receiver_company: receiverDriver?.company_name || null,
            receiver_siret: receiverDriver?.siret || null,
            receiver_phone: receiverProfile?.phone || null,
            receiver_sharing_number: receiverDriver?.sharing_number || null,
            receiver_photo: receiverDriver?.card_photo_url || receiverProfile?.profile_photo_url || null,
          });
        } catch (docError) {
          console.error('Error enriching document:', doc.id, docError);
        }
      }

      setDocuments(enrichedDocs);
    } catch (err) {
      console.error('Error loading partner order documents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (doc: PartnerOrderDocument) => {
    const isSender = doc.sender_driver_id === driverId;
    
    try {
      await generatePartnerOrderDocumentPDF({
        document_number: doc.document_number,
        pickup_address: doc.pickup_address,
        destination_address: doc.destination_address,
        scheduled_date: doc.scheduled_date,
        distance_km: doc.distance_km,
        passengers_count: doc.passengers_count,
        course_amount: doc.course_amount,
        commission_percentage: doc.commission_percentage,
        commission_amount: doc.commission_amount,
        receiver_earnings: doc.receiver_earnings,
        payment_method_used: doc.payment_method_used,
        completed_at: doc.completed_at,
        sender_name: doc.sender_name,
        sender_company: doc.sender_company,
        sender_siret: doc.sender_siret,
        sender_phone: doc.sender_phone,
        sender_sharing_number: doc.sender_sharing_number,
        receiver_name: doc.receiver_name,
        receiver_company: doc.receiver_company,
        receiver_siret: doc.receiver_siret,
        receiver_phone: doc.receiver_phone,
        receiver_sharing_number: doc.receiver_sharing_number,
      }, isSender ? 'sender' : 'receiver');
      
      toast.success('Bon de commande téléchargé');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return null;
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  if (loading) {
    return (
      <Card className="border-purple-500/20 animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 w-48 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('CompletedPartnerCoursesList error:', error);
    return null;
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Handshake className="h-5 w-5" />
          Courses partenaires terminées ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((doc) => {
          const isSender = doc.sender_driver_id === driverId;
          const partnerName = isSender ? doc.receiver_name : doc.sender_name;
          const partnerPhoto = isSender ? doc.receiver_photo : doc.sender_photo;
          const partnerSharingNumber = isSender ? doc.receiver_sharing_number : doc.sender_sharing_number;

          return (
            <div 
              key={doc.id} 
              className={cn(
                "p-3 rounded-lg border flex items-center gap-3",
                isSender ? "bg-green-500/5 border-green-500/20" : "bg-blue-500/5 border-blue-500/20"
              )}
            >
              {/* Direction indicator */}
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                isSender ? "bg-green-500/20" : "bg-blue-500/20"
              )}>
                {isSender ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownLeft className="h-5 w-5 text-blue-600" />
                )}
              </div>

              {/* Partner info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={partnerPhoto || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {partnerName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{partnerName}</span>
                  {partnerSharingNumber && (
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                      {formatSharingNumber(partnerSharingNumber)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(doc.scheduled_date), "d MMM yyyy", { locale: fr })}
                  {doc.distance_km && (
                    <>
                      <Car className="h-3 w-3 ml-2" />
                      {doc.distance_km.toFixed(0)} km
                    </>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {doc.document_number}
                </p>
              </div>

              {/* Financial info */}
              <div className="text-right shrink-0">
                {isSender ? (
                  <>
                    <p className="text-sm font-bold text-green-600">
                      +{doc.commission_amount.toFixed(2)} €
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Frais de transaction à recevoir
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-blue-600">
                      {doc.receiver_earnings.toFixed(2)} €
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Votre gain net
                    </p>
                  </>
                )}
                {doc.payment_method_used && (
                  <Badge variant="outline" className="text-[9px] mt-1">
                    {PAYMENT_METHOD_LABELS[doc.payment_method_used] || doc.payment_method_used}
                  </Badge>
                )}
              </div>

              {/* Download button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => handleDownloadPDF(doc)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

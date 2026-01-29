import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  MapPin, 
  QrCode, 
  Truck, 
  Check, 
  Clock, 
  ExternalLink,
  Copy,
  Loader2,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NfcOrderStatusProps {
  driverId: string;
  nfcPlateOrderId?: string | null;
}

interface NfcOrder {
  id: string;
  order_number: string;
  plate_type: string;
  qr_code_link: string;
  payment_status: string;
  delivery_status: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  shipped_at?: string;
  created_at: string;
}

export function NfcOrderStatus({ driverId, nfcPlateOrderId }: NfcOrderStatusProps) {
  const [order, setOrder] = useState<NfcOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [driverId, nfcPlateOrderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      // Chercher par nfc_plate_order_id ou par driver_id
      let query = supabase
        .from('nfc_plate_orders')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching NFC order:', error);
      }
      
      if (data) {
        setOrder(data);
        setNewAddress(data.shipping_address || '');
        setNewCity(data.shipping_city || '');
        setNewPostalCode(data.shipping_postal_code || '');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!order || !newAddress.trim() || !newCity.trim() || !newPostalCode.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!/^\d{5}$/.test(newPostalCode.trim())) {
      toast.error('Le code postal doit contenir 5 chiffres');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('nfc_plate_orders')
        .update({
          shipping_address: newAddress.trim(),
          shipping_city: newCity.trim(),
          shipping_postal_code: newPostalCode.trim(),
          delivery_status: 'pending', // Prêt pour expédition
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Adresse de livraison mise à jour !');
      setEditAddress(false);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyLink = () => {
    if (order?.qr_code_link) {
      navigator.clipboard.writeText(order.qr_code_link);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      pending: { label: 'En attente de paiement', variant: 'outline', icon: Clock },
      paid: { label: 'Payé', variant: 'default', icon: CreditCard },
      pending_address: { label: 'Adresse à compléter', variant: 'destructive', icon: AlertCircle },
      preparing: { label: 'En préparation', variant: 'secondary', icon: Package },
      shipped: { label: 'Expédié', variant: 'default', icon: Truck },
      delivered: { label: 'Livré', variant: 'default', icon: Check },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPlateTypeName = (type: string) => {
    return type === 'standard' ? 'Plaque NFC Bois' : 'Plaque NFC Premium (Plastique)';
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return null;
  }

  const needsAddress = order.delivery_status === 'pending_address' || 
    order.shipping_address === 'À compléter' ||
    !order.shipping_address;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Ma Plaque NFC
          </div>
          {getStatusBadge(order.payment_status === 'paid' ? order.delivery_status : order.payment_status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type de plaque */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Type de plaque</span>
          <span className="font-medium">{getPlateTypeName(order.plate_type)}</span>
        </div>

        {/* Numéro de commande */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">N° de commande</span>
          <span className="font-mono text-sm">{order.order_number}</span>
        </div>

        {/* Lien QR Code */}
        {order.qr_code_link && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="w-4 h-4" />
              Lien de votre plaque NFC
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={order.qr_code_link}
                readOnly
                className="text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(order.qr_code_link, '_blank')}
                className="shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Adresse de livraison */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Adresse de livraison
            </div>
            {!editAddress && order.payment_status === 'paid' && order.delivery_status !== 'shipped' && order.delivery_status !== 'delivered' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditAddress(true)}
                className="text-xs h-7"
              >
                Modifier
              </Button>
            )}
          </div>

          {needsAddress || editAddress ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Adresse</Label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="123 Rue de la République"
                  className="h-9 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Code postal</Label>
                  <Input
                    value={newPostalCode}
                    onChange={(e) => setNewPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="75001"
                    maxLength={5}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ville</Label>
                  <Input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Paris"
                    className="h-9 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateAddress}
                  disabled={updating}
                  className="flex-1"
                  size="sm"
                >
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
                {editAddress && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditAddress(false);
                      setNewAddress(order.shipping_address);
                      setNewCity(order.shipping_city);
                      setNewPostalCode(order.shipping_postal_code);
                    }}
                    size="sm"
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <p>{order.shipping_address}</p>
              <p>{order.shipping_postal_code} {order.shipping_city}</p>
            </div>
          )}
        </div>

        {/* Numéro de suivi si expédié */}
        {order.tracking_number && (
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-success" />
              <span>N° de suivi</span>
            </div>
            <span className="font-mono text-sm">{order.tracking_number}</span>
          </div>
        )}

        {/* Date estimée de livraison */}
        {order.estimated_delivery_date && order.delivery_status !== 'delivered' && (
          <div className="text-xs text-muted-foreground text-center">
            Livraison estimée : {new Date(order.estimated_delivery_date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

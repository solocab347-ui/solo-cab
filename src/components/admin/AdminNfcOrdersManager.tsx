import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  MapPin,
  User,
  Mail,
  Phone,
  QrCode,
  Send,
  AlertCircle,
} from "lucide-react";

interface NfcOrder {
  id: string;
  order_number: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  payment_status: string;
  delivery_status: string;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery_date: string | null;
  qr_code_link: string | null;
  driver_id: string | null;
  created_at: string;
  amount: number;
  notes: string | null;
  with_subscription: boolean;
  tracking_token: string;
}

const AdminNfcOrdersManager = () => {
  const [orders, setOrders] = useState<NfcOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<NfcOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Update form
  const [trackingNumber, setTrackingNumber] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nfc_plate_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const updates: any = {
        notes,
        updated_at: new Date().toISOString(),
      };

      if (trackingNumber) {
        updates.tracking_number = trackingNumber;
      }

      const statusChanged = newStatus && newStatus !== selectedOrder.delivery_status;

      if (newStatus) {
        updates.delivery_status = newStatus;
        if (newStatus === "shipped") {
          updates.shipped_at = new Date().toISOString();
          // Estimation de livraison à 7 jours
          const estimatedDate = new Date();
          estimatedDate.setDate(estimatedDate.getDate() + 7);
          updates.estimated_delivery_date = estimatedDate.toISOString().split('T')[0];
        } else if (newStatus === "delivered") {
          updates.delivered_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("nfc_plate_orders")
        .update(updates)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Envoyer l'email si demandé et si le statut a changé
      if (sendEmail && statusChanged && ["preparing", "shipped", "delivered"].includes(newStatus)) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-nfc-status-email", {
            body: {
              order_id: selectedOrder.id,
              new_status: newStatus,
              tracking_number: trackingNumber || null,
            },
          });

          if (emailError) {
            console.error("Email error:", emailError);
            toast.warning("Commande mise à jour mais échec de l'envoi d'email");
          } else {
            toast.success(`Commande mise à jour et email envoyé à ${selectedOrder.email}`);
          }
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
          toast.warning("Commande mise à jour mais échec de l'envoi d'email");
        }
      } else {
        toast.success("Commande mise à jour");
      }

      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-success">Livré</Badge>;
      case "shipped":
        return <Badge className="bg-blue-500">Expédié</Badge>;
      case "preparing":
        return <Badge className="bg-orange-500">En préparation</Badge>;
      case "pending_address":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Adresse manquante</Badge>;
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success">Payé</Badge>;
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="destructive">Échoué</Badge>;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.first_name} ${order.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.delivery_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => (o.delivery_status === "pending" || o.delivery_status === "pending_address") && o.payment_status === "paid").length,
    pendingAddress: orders.filter((o) => o.delivery_status === "pending_address" && o.payment_status === "paid").length,
    shipped: orders.filter((o) => o.delivery_status === "shipped").length,
    delivered: orders.filter((o) => o.delivery_status === "delivered").length,
    revenue: orders.filter((o) => o.payment_status === "paid").reduce((acc, o) => acc + Number(o.amount), 0) / 100, // Convertir centimes en euros
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des livraisons NFC</h2>
          <p className="text-muted-foreground">
            Gérez les commandes de plaques NFC Coutras
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">À expédier</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.shipped}</p>
              <p className="text-sm text-muted-foreground">En transit</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.delivered}</p>
              <p className="text-sm text-muted-foreground">Livrées</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">€</span>
            <div>
              <p className="text-2xl font-bold">{stats.revenue.toFixed(2)}€</p>
              <p className="text-sm text-muted-foreground">Revenus</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro, email ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut livraison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="pending_address">Adresse manquante</SelectItem>
              <SelectItem value="preparing">En préparation</SelectItem>
              <SelectItem value="shipped">Expédié</SelectItem>
              <SelectItem value="delivered">Livré</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Orders table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Livraison</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono font-medium">{order.order_number}</p>
                      {order.driver_id && (
                        <Badge variant="outline" className="mt-1">
                          <User className="w-3 h-3 mr-1" />
                          Chauffeur lié
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.first_name} {order.last_name}</p>
                      <p className="text-sm text-muted-foreground">{order.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{order.shipping_address}</p>
                      <p className="text-muted-foreground">
                        {order.shipping_postal_code} {order.shipping_city}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getPaymentBadge(order.payment_status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(order.delivery_status)}
                      {order.tracking_number && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {order.tracking_number}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setTrackingNumber(order.tracking_number || "");
                            setNewStatus(order.delivery_status);
                            setNotes(order.notes || "");
                          }}
                        >
                          Gérer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Commande {order.order_number}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Client info */}
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{order.first_name} {order.last_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{order.email}</span>
                            </div>
                            {order.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{order.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {order.shipping_postal_code} {order.shipping_city}
                              </span>
                            </div>
                          </div>

                          {/* QR Code link */}
                          {order.qr_code_link && (
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <QrCode className="w-4 h-4 text-primary" />
                                <span className="font-medium">Lien QR Code à programmer</span>
                              </div>
                              <code className="text-xs bg-background px-2 py-1 rounded block overflow-auto">
                                {order.qr_code_link}
                              </code>
                            </div>
                          )}

                          {/* Update form */}
                          <div className="space-y-4">
                            <div>
                              <Label>Statut de livraison</Label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">En attente</SelectItem>
                                  <SelectItem value="preparing">En préparation</SelectItem>
                                  <SelectItem value="shipped">Expédié</SelectItem>
                                  <SelectItem value="delivered">Livré</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Numéro de suivi transporteur</Label>
                              <Input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Ex: 1Z999AA10123456784"
                              />
                            </div>

                            <div>
                              <Label>Notes internes</Label>
                              <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes sur la commande..."
                                rows={3}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={handleUpdateOrder}
                            disabled={updating}
                            className="w-full"
                          >
                            {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Mettre à jour
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminNfcOrdersManager;

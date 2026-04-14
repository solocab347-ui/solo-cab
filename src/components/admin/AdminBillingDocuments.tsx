import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { FileText, Download, Plus, Trash2, Euro, Percent } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

// Informations SoloCab fixes
const SOLOCAB_INFO = {
  name: "Kanoute Abdallah",
  companyName: "SOLOCAB",
  legalForm: "SASU",
  address: "10 rue de Penthièvre",
  postalCode: "75008",
  city: "Paris",
  country: "France",
  siren: "994 176 576",
  rcs: "RCS Paris 994 176 576",
  tvaNumber: "FR75 994176576",
  email: "contact@solocab.fr",
  website: "www.solocab.fr"
};

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isMonthly?: boolean;
}

interface GeneratedDocument {
  id: string;
  type: "devis" | "facture";
  number: string;
  clientName: string;
  total: number;
  totalTTC: number;
  createdAt: Date;
  items: LineItem[];
  depositAmount?: number;
  balanceAmount?: number;
}

const AdminBillingDocuments = () => {
  const [documentType, setDocumentType] = useState<"devis" | "facture">("devis");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [tvaRate, setTvaRate] = useState(20);
  const [validityDays, setValidityDays] = useState(30);
  
  // Acompte
  const [enableDeposit, setEnableDeposit] = useState(true);
  const [depositPercent, setDepositPercent] = useState(30);
  
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, isMonthly: false }
  ]);

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentCounter, setDocumentCounter] = useState({ devis: 1, facture: 1 });

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0, isMonthly: false }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Calculs séparés pour prestations uniques et mensuelles
  const getOneTimeItems = () => items.filter(item => !item.isMonthly);
  const getMonthlyItems = () => items.filter(item => item.isMonthly);

  const calculateOneTimeSubtotal = () => {
    return getOneTimeItems().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateMonthlySubtotal = () => {
    return getMonthlyItems().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTVA = () => {
    return calculateSubtotal() * (tvaRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTVA();
  };

  // Calculs acompte (uniquement sur les prestations uniques, pas mensuelles)
  const calculateOneTimeTotalTTC = () => {
    const ht = calculateOneTimeSubtotal();
    return ht + (ht * tvaRate / 100);
  };

  const calculateDeposit = () => {
    if (!enableDeposit) return 0;
    return calculateOneTimeTotalTTC() * (depositPercent / 100);
  };

  const calculateBalance = () => {
    if (!enableDeposit) return calculateOneTimeTotalTTC();
    return calculateOneTimeTotalTTC() - calculateDeposit();
  };

  const generateDocumentNumber = (type: "devis" | "facture") => {
    const prefix = type === "devis" ? "DEV" : "FAC";
    const year = new Date().getFullYear();
    const number = documentCounter[type].toString().padStart(4, "0");
    return `${prefix}-${year}-${number}`;
  };

  const generatePDF = () => {
    if (!clientName.trim()) {
      toast.error("Veuillez entrer le nom du client");
      return;
    }

    if (items.some(item => !item.description.trim() || item.unitPrice <= 0)) {
      toast.error("Veuillez remplir toutes les lignes correctement");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Header - SoloCab Logo Area
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 35, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("SOLOCAB", margin, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Solutions VTC & Applications Mobiles", margin, 30);

    // Document Type Badge
    const docNumber = generateDocumentNumber(documentType);
    doc.setFillColor(documentType === "devis" ? 59 : 34, documentType === "devis" ? 130 : 197, documentType === "devis" ? 246 : 94);
    doc.roundedRect(pageWidth - 70, 10, 50, 20, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(documentType.toUpperCase(), pageWidth - 45, 23, { align: "center" });

    // Document Number & Date
    let yPos = 50;
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${documentType === "devis" ? "Devis" : "Facture"} N° ${docNumber}`, margin, yPos);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const today = new Date();
    doc.text(`Date : ${today.toLocaleDateString("fr-FR")}`, pageWidth - margin, yPos, { align: "right" });

    if (documentType === "devis") {
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + validityDays);
      doc.text(`Valide jusqu'au : ${validUntil.toLocaleDateString("fr-FR")}`, pageWidth - margin, yPos + 5, { align: "right" });
    }

    // Separator
    yPos += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Two columns: Émetteur & Client
    yPos += 10;

    // Émetteur (Left)
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth / 2 - 5, 50, 3, 3, "F");

    doc.setTextColor(30, 64, 175);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ÉMETTEUR", margin + 5, yPos + 8);

    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(SOLOCAB_INFO.name, margin + 5, yPos + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(SOLOCAB_INFO.address, margin + 5, yPos + 25);
    doc.text(`${SOLOCAB_INFO.postalCode} ${SOLOCAB_INFO.city}`, margin + 5, yPos + 31);
    doc.text(`SIREN : ${SOLOCAB_INFO.siren}`, margin + 5, yPos + 37);
    doc.text(`TVA : ${SOLOCAB_INFO.tvaNumber}`, margin + 5, yPos + 43);

    // Client (Right)
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(pageWidth / 2 + 5, yPos, contentWidth / 2 - 5, 50, 3, 3, "F");

    doc.setTextColor(30, 64, 175);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT", pageWidth / 2 + 10, yPos + 8);

    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(clientName, pageWidth / 2 + 10, yPos + 18);

    if (clientAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const addressLines = doc.splitTextToSize(clientAddress, contentWidth / 2 - 20);
      doc.text(addressLines, pageWidth / 2 + 10, yPos + 25);
    }

    if (clientEmail) {
      doc.setFontSize(9);
      doc.text(clientEmail, pageWidth / 2 + 10, yPos + 43);
    }

    // Items Table
    yPos += 60;

    // Table Header
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, yPos, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Description", margin + 5, yPos + 7);
    doc.text("Qté", margin + 100, yPos + 7);
    doc.text("Prix Unit. HT", margin + 115, yPos + 7);
    doc.text("Total HT", pageWidth - margin - 5, yPos + 7, { align: "right" });

    yPos += 10;

    // Table Rows
    items.forEach((item, index) => {
      const rowHeight = 10;
      const bgColor = index % 2 === 0 ? 255 : 248;
      doc.setFillColor(bgColor, bgColor, bgColor);
      doc.rect(margin, yPos, contentWidth, rowHeight, "F");

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      const desc = item.isMonthly ? `${item.description} (mensuel)` : item.description;
      doc.text(desc, margin + 5, yPos + 7);
      doc.text(item.quantity.toString(), margin + 100, yPos + 7);
      doc.text(`${item.unitPrice.toFixed(2)} €`, margin + 115, yPos + 7);
      doc.text(`${(item.quantity * item.unitPrice).toFixed(2)} €`, pageWidth - margin - 5, yPos + 7, { align: "right" });

      yPos += rowHeight;
    });

    // Totals
    yPos += 10;
    const totalsX = pageWidth - margin - 80;

    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX, yPos, pageWidth - margin, yPos);

    yPos += 8;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text("Sous-total HT :", totalsX, yPos);
    doc.text(`${calculateSubtotal().toFixed(2)} €`, pageWidth - margin, yPos, { align: "right" });

    yPos += 7;
    doc.text(`TVA (${tvaRate}%) :`, totalsX, yPos);
    doc.text(`${calculateTVA().toFixed(2)} €`, pageWidth - margin, yPos, { align: "right" });

    yPos += 2;
    doc.line(totalsX, yPos, pageWidth - margin, yPos);

    yPos += 8;
    doc.setFillColor(30, 64, 175);
    doc.roundedRect(totalsX - 5, yPos - 6, 85, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL TTC :", totalsX, yPos + 2);
    doc.text(`${calculateTotal().toFixed(2)} €`, pageWidth - margin - 3, yPos + 2, { align: "right" });

    // Payment Schedule (if deposit enabled and one-time items exist)
    if (enableDeposit && getOneTimeItems().length > 0) {
      yPos += 20;
      
      doc.setFillColor(255, 250, 240);
      doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, "F");
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, "S");

      doc.setTextColor(180, 83, 9);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("ÉCHÉANCIER DE PAIEMENT", margin + 5, yPos + 10);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);

      // Acompte
      yPos += 18;
      doc.setFont("helvetica", "bold");
      doc.text(`Acompte (${depositPercent}%) - À la commande :`, margin + 10, yPos);
      doc.setTextColor(34, 197, 94);
      doc.text(`${calculateDeposit().toFixed(2)} € TTC`, pageWidth - margin - 10, yPos, { align: "right" });

      // Solde
      yPos += 10;
      doc.setTextColor(60, 60, 60);
      doc.text(`Solde (${100 - depositPercent}%) - À la livraison :`, margin + 10, yPos);
      doc.setTextColor(59, 130, 246);
      doc.text(`${calculateBalance().toFixed(2)} € TTC`, pageWidth - margin - 10, yPos, { align: "right" });

      // Note mensuel
      if (getMonthlyItems().length > 0) {
        yPos += 10;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(`+ Frais mensuels : ${calculateMonthlySubtotal().toFixed(2)} € HT/mois (${(calculateMonthlySubtotal() * (1 + tvaRate/100)).toFixed(2)} € TTC/mois)`, margin + 10, yPos);
      }
    }

    // Notes
    if (notes) {
      yPos += 25;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Notes :", margin, yPos);
      doc.setFont("helvetica", "normal");
      const notesLines = doc.splitTextToSize(notes, contentWidth);
      doc.text(notesLines, margin, yPos + 6);
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 25;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${SOLOCAB_INFO.companyName} - ${SOLOCAB_INFO.legalForm} | ${SOLOCAB_INFO.rcs}`, pageWidth / 2, footerY + 8, { align: "center" });
    doc.text(`${SOLOCAB_INFO.address}, ${SOLOCAB_INFO.postalCode} ${SOLOCAB_INFO.city} | ${SOLOCAB_INFO.email} | ${SOLOCAB_INFO.website}`, pageWidth / 2, footerY + 14, { align: "center" });

    // Save PDF
    doc.save(`${documentType === "devis" ? "Devis" : "Facture"}_${docNumber}_${clientName.replace(/\s+/g, "_")}.pdf`);

    // Update counter and save document
    setDocumentCounter(prev => ({
      ...prev,
      [documentType]: prev[documentType] + 1
    }));

    const newDocument: GeneratedDocument = {
      id: Date.now().toString(),
      type: documentType,
      number: docNumber,
      clientName,
      total: calculateSubtotal(),
      totalTTC: calculateTotal(),
      createdAt: new Date(),
      items: [...items],
      depositAmount: enableDeposit ? calculateDeposit() : undefined,
      balanceAmount: enableDeposit ? calculateBalance() : undefined
    };

    setDocuments(prev => [newDocument, ...prev]);

    toast.success(`${documentType === "devis" ? "Devis" : "Facture"} ${docNumber} généré(e) avec succès !`);

    // Reset form
    setClientName("");
    setClientAddress("");
    setClientEmail("");
    setNotes("");
    setItems([{ id: "1", description: "", quantity: 1, unitPrice: 0, isMonthly: false }]);
  };

  // Pre-fill for the specific request
  const prefillCameroonApp = () => {
    setClientName("Fodouop Waffo Calliste Ghislain");
    setItems([
      { id: "1", description: "Création d'application VTC (forfait)", quantity: 1, unitPrice: 999, isMonthly: false },
      { id: "2", description: "Implémentation gestion NFC", quantity: 1, unitPrice: 200, isMonthly: false },
      { id: "3", description: "Abonnement Premium chauffeur mensuel", quantity: 1, unitPrice: 19.99, isMonthly: true }
    ]);
    setTvaRate(20);
    setValidityDays(30);
    setEnableDeposit(true);
    setDepositPercent(30);
    setNotes("Acompte de 30% à la commande pour démarrer le développement.\nSolde de 70% à la livraison de l'application.\nAssistance mensuelle facturée à partir du mois suivant la mise en production.");
    toast.success("Formulaire pré-rempli pour le projet Cameroun");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Devis & Factures Admin
          </h2>
          <p className="text-muted-foreground">
            Générez des documents professionnels pour vos services
          </p>
        </div>
        <Button variant="outline" onClick={prefillCameroonApp} className="gap-2">
          <Plus className="w-4 h-4" />
          Projet Cameroun
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="p-6 space-y-6">
          {/* Document Type */}
          <div className="flex gap-2">
            <Button
              variant={documentType === "devis" ? "default" : "outline"}
              onClick={() => setDocumentType("devis")}
              className="flex-1"
            >
              Devis
            </Button>
            <Button
              variant={documentType === "facture" ? "default" : "outline"}
              onClick={() => setDocumentType("facture")}
              className="flex-1"
            >
              Facture
            </Button>
          </div>

          <Separator />

          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informations Client</h3>
            <div className="space-y-3">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom et prénom du client"
                />
              </div>
              <div>
                <Label>Adresse</Label>
                <Textarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Adresse complète"
                  rows={2}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Prestations</h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {items.map((item) => (
              <div key={item.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Description de la prestation"
                    className="flex-1"
                  />
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Prix HT (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      checked={item.isMonthly}
                      onChange={(e) => updateItem(item.id, "isMonthly", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label className="text-xs">Mensuel</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>TVA (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={tvaRate}
                onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            {documentType === "devis" && (
              <div>
                <Label>Validité (jours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                />
              </div>
            )}
          </div>

          {/* Deposit Options */}
          {documentType === "devis" && getOneTimeItems().length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-600" />
                  <Label className="font-semibold">Acompte</Label>
                </div>
                <Switch
                  checked={enableDeposit}
                  onCheckedChange={setEnableDeposit}
                />
              </div>
              
              {enableDeposit && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Pourcentage d'acompte</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={depositPercent}
                        onChange={(e) => setDepositPercent(parseInt(e.target.value) || 30)}
                        className="w-20"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acompte à la commande :</span>
                      <span className="font-semibold text-green-600">{calculateDeposit().toFixed(2)} € TTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Solde à la livraison :</span>
                      <span className="font-semibold text-blue-600">{calculateBalance().toFixed(2)} € TTC</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes / Conditions</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions de paiement, mentions particulières..."
              rows={3}
            />
          </div>

          {/* Totals & Generate */}
          <div className="bg-primary/5 p-4 rounded-lg space-y-2">
            {getOneTimeItems().length > 0 && (
              <div className="flex justify-between text-sm">
                <span>Prestations uniques HT</span>
                <span>{calculateOneTimeSubtotal().toFixed(2)} €</span>
              </div>
            )}
            {getMonthlyItems().length > 0 && (
              <div className="flex justify-between text-sm">
                <span>Frais mensuels HT</span>
                <span>{calculateMonthlySubtotal().toFixed(2)} €/mois</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span>Sous-total HT</span>
              <span className="font-medium">{calculateSubtotal().toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>TVA ({tvaRate}%)</span>
              <span className="font-medium">{calculateTVA().toFixed(2)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span className="text-primary">{calculateTotal().toFixed(2)} €</span>
            </div>
            {enableDeposit && getOneTimeItems().length > 0 && documentType === "devis" && (
              <>
                <Separator />
                <div className="flex justify-between text-sm text-green-600">
                  <span>→ À payer maintenant ({depositPercent}%)</span>
                  <span className="font-bold">{calculateDeposit().toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-blue-600">
                  <span>→ À payer à la livraison ({100 - depositPercent}%)</span>
                  <span className="font-bold">{calculateBalance().toFixed(2)} €</span>
                </div>
              </>
            )}
          </div>

          <Button onClick={generatePDF} className="w-full gap-2" size="lg">
            <Download className="w-5 h-5" />
            Générer le {documentType === "devis" ? "Devis" : "la Facture"} PDF
          </Button>
        </Card>

        {/* Preview / History */}
        <div className="space-y-6">
          {/* Émetteur Info */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Émetteur (SoloCab)
            </h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">{SOLOCAB_INFO.name}</p>
              <p>{SOLOCAB_INFO.address}</p>
              <p>{SOLOCAB_INFO.postalCode} {SOLOCAB_INFO.city}</p>
              <p>SIREN : {SOLOCAB_INFO.siren}</p>
              <p>TVA : {SOLOCAB_INFO.tvaNumber}</p>
            </div>
          </Card>

          {/* Documents History */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Documents générés</h3>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Aucun document généré pour l'instant
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.type === "devis" ? "default" : "secondary"}>
                            {doc.type.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{doc.number}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{doc.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.createdAt.toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{doc.totalTTC.toFixed(2)} €</p>
                        <p className="text-xs text-muted-foreground">TTC</p>
                      </div>
                    </div>
                    {doc.depositAmount && (
                      <div className="mt-2 pt-2 border-t text-xs space-y-1">
                        <div className="flex justify-between text-green-600">
                          <span>Acompte :</span>
                          <span>{doc.depositAmount.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-blue-600">
                          <span>Solde :</span>
                          <span>{doc.balanceAmount?.toFixed(2)} €</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBillingDocuments;

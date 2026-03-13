import { NavigationHeader } from "@/components/NavigationHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  CreditCard,
  Users,
  Car,
  FileText,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const CancellationPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <NavigationHeader showBack showHome homeRoute="/" />

        <div className="mt-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Politique d'annulation</h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Notre politique d'annulation est conçue pour protéger à la fois les clients et les chauffeurs. 
              Veuillez en prendre connaissance avant de réserver.
            </p>
            <Badge variant="outline" className="text-xs">
              Dernière mise à jour : Mars 2026
            </Badge>
          </div>

          {/* Section 1: Empreinte bancaire */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-lg font-semibold text-foreground">Empreinte bancaire à la réservation</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Lors de la confirmation de votre réservation, une <strong className="text-foreground">empreinte bancaire</strong> peut être 
                requise pour garantir la disponibilité de votre chauffeur. Il ne s'agit pas d'un débit immédiat : 
                votre carte est simplement vérifiée et un montant de garantie est temporairement autorisé.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Le montant de garantie est <strong className="text-foreground">automatiquement déduit</strong> du prix final de votre course
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    En cas d'annulation dans les délais, l'autorisation est <strong className="text-foreground">annulée sans frais</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Paiement 100% sécurisé via <strong className="text-foreground">Stripe</strong>, leader mondial du paiement en ligne
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Annulation par le client (sans acompte) */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-lg font-semibold text-foreground">Annulation par le client</h2>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Sans acompte</Badge>
                  Avec empreinte bancaire uniquement
                </h3>
                
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
                    <Clock className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Plus de 1 heure avant la course</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Annulation <strong className="text-emerald-600">gratuite</strong>. L'empreinte bancaire est automatiquement annulée, aucun frais.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Moins de 1 heure avant la course</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Des <strong className="text-foreground">frais d'annulation tardive</strong> seront prélevés sur l'empreinte bancaire 
                        pour compenser l'immobilisation du chauffeur.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Avec acompte</Badge>
                  Acompte versé à la réservation
                </h3>

                <div className="grid gap-3">
                  <div className="flex items-start gap-3 bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
                    <Clock className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Plus de 4 heures avant la course</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Annulation avec <strong className="text-emerald-600">remboursement intégral</strong> de l'acompte.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Moins de 4 heures avant la course</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        L'acompte est <strong className="text-foreground">conservé par le chauffeur</strong> en compensation.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Acompte manuel</Badge>
                  Acompte demandé par le chauffeur via lien de paiement
                </h3>

                <div className="flex items-start gap-3 bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                  <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Non remboursable</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les acomptes versés via lien de paiement sont <strong className="text-foreground">strictement non remboursables</strong> en cas 
                      d'annulation par le client, quel que soit le délai.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Annulation par le chauffeur */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-lg font-semibold text-foreground">Annulation par le chauffeur</h2>
              </div>

              <div className="flex items-start gap-3 bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Remboursement intégral automatique</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si le chauffeur annule la course, <strong className="text-foreground">l'intégralité de l'acompte ou de l'empreinte bancaire 
                    est automatiquement remboursée</strong> au client, sans aucun frais et quel que soit le délai.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Déroulement du paiement */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-lg font-semibold text-foreground">Déroulement du paiement</h2>
              </div>

              <div className="space-y-3">
                {[
                  { step: "1", title: "Réservation", desc: "Vous réservez et validez votre empreinte bancaire pour garantir la course." },
                  { step: "2", title: "Confirmation", desc: "Votre chauffeur confirme la course. Votre carte n'est pas débitée." },
                  { step: "3", title: "Course effectuée", desc: "À la fin de la course, le montant final est débité de votre carte. La garantie initiale est déduite." },
                  { step: "4", title: "Facturation", desc: "Vous recevez automatiquement votre facture par email." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer links */}
          <div className="text-center space-y-3 pb-8">
            <p className="text-xs text-muted-foreground">
              Cette politique fait partie intégrante de nos conditions générales d'utilisation.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/terms-of-service">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <FileText className="w-3 h-3" />
                  Conditions générales
                </Button>
              </Link>
              <Link to="/privacy-policy">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Shield className="w-3 h-3" />
                  Confidentialité
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;

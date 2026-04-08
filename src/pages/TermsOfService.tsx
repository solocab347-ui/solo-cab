import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, AlertTriangle, CreditCard, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();
  const lastUpdated = "10 décembre 2024";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Conditions Générales d'Utilisation</h1>
            <p className="text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">
            
            {/* Article 1 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Article 1 - Objet
              </h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la 
                plateforme SoloCab, accessible via l'application mobile et le site web solocab.fr.
              </p>
              <p>
                SoloCab est une plateforme de mise en relation entre des chauffeurs VTC indépendants 
                et des clients particuliers ou professionnels souhaitant réserver des services de 
                transport avec chauffeur.
              </p>
            </section>

            {/* Article 2 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Article 2 - Inscription et compte utilisateur
              </h2>
              
              <h3 className="text-lg font-medium">2.1 Conditions d'inscription</h3>
              <p>L'inscription sur SoloCab est réservée aux personnes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Majeures (18 ans minimum)</li>
                <li>Capables juridiquement de contracter</li>
                <li>Fournissant des informations exactes et à jour</li>
              </ul>

              <h3 className="text-lg font-medium">2.2 Inscription des chauffeurs</h3>
              <p>Les chauffeurs VTC doivent obligatoirement :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posséder une carte professionnelle VTC valide</li>
                <li>Être immatriculés au registre du commerce (SIRET)</li>
                <li>Disposer d'une assurance professionnelle valide</li>
                <li>Fournir les documents justificatifs lors de l'inscription</li>
                <li>Être validés par l'administration SoloCab avant activation du compte</li>
              </ul>

              <h3 className="text-lg font-medium">2.3 Responsabilité du compte</h3>
              <p>
                Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion 
                et de toutes les activités effectuées depuis son compte.
              </p>
            </section>

            {/* Article 3 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 3 - Fonctionnement du service</h2>
              
              <h3 className="text-lg font-medium">3.1 Réservation d'une course</h3>
              <p>Le processus de réservation se déroule comme suit :</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Le client crée une demande de course (lieu de prise en charge, destination, date/heure)</li>
                <li>Un devis est automatiquement généré selon les tarifs du chauffeur</li>
                <li>Le client accepte le devis</li>
                <li>Le chauffeur confirme la course</li>
                <li>La course est réalisée</li>
                <li>Le paiement est effectué et la facture générée</li>
              </ol>

              <h3 className="text-lg font-medium">3.2 Annulation</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Annulation gratuite jusqu'à 24h avant la course</li>
                <li>Annulation entre 24h et 2h : 50% du montant peut être facturé</li>
                <li>Annulation moins de 2h avant : 100% du montant peut être facturé</li>
              </ul>

              <h3 className="text-lg font-medium">3.3 Rôle de SoloCab</h3>
              <p>
                SoloCab agit uniquement comme intermédiaire technique entre chauffeurs et clients. 
                Le contrat de transport est conclu directement entre le chauffeur VTC et le client. 
                SoloCab n'est pas partie prenante à ce contrat.
              </p>
            </section>

            {/* Article 4 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Article 4 - Tarifs et paiement
              </h2>
              
              <h3 className="text-lg font-medium">4.1 Tarification des courses</h3>
              <p>
                Chaque chauffeur fixe librement ses tarifs (prix de base, prix au kilomètre, 
                tarif horaire). Les prix affichés incluent la TVA applicable.
              </p>

              <h3 className="text-lg font-medium">4.2 Abonnement chauffeur</h3>
              <p>
                L'utilisation de la plateforme par les chauffeurs est <strong>gratuite</strong> pour les fonctionnalités de base 
                (gestion clients, courses, factures, QR code). Un abonnement Premium à 9,99€ TTC/mois 
                donne accès aux fonctionnalités avancées (partenariats, promotions, prospection).
              </p>

              <h3 className="text-lg font-medium">4.3 Moyens de paiement</h3>
              <p>
                Les paiements sont traités de manière sécurisée via Stripe. Les modes de paiement 
                acceptés incluent les cartes bancaires, virements et espèces (entre chauffeur et client).
              </p>
            </section>

            {/* Article 5 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 5 - Obligations des utilisateurs</h2>
              
              <h3 className="text-lg font-medium">5.1 Obligations des chauffeurs</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintenir à jour leurs documents professionnels</li>
                <li>Respecter les horaires convenus avec les clients</li>
                <li>Assurer un service de qualité professionnelle</li>
                <li>Maintenir leur véhicule en bon état</li>
                <li>Respecter le code de la route et les réglementations VTC</li>
              </ul>

              <h3 className="text-lg font-medium">5.2 Obligations des clients</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fournir des informations exactes lors de la réservation</li>
                <li>Être présent à l'heure et au lieu convenus</li>
                <li>Traiter le chauffeur et le véhicule avec respect</li>
                <li>Régler le montant de la course convenu</li>
              </ul>
            </section>

            {/* Article 6 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Article 6 - Responsabilités et limitations
              </h2>
              
              <h3 className="text-lg font-medium">6.1 Responsabilité de SoloCab</h3>
              <p>
                SoloCab s'engage à assurer le bon fonctionnement technique de la plateforme. 
                Toutefois, SoloCab ne saurait être tenu responsable :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Des prestations réalisées par les chauffeurs</li>
                <li>Des dommages survenus pendant une course</li>
                <li>Des interruptions de service dues à des causes externes</li>
                <li>Des litiges entre chauffeurs et clients</li>
              </ul>

              <h3 className="text-lg font-medium">6.2 Assurances</h3>
              <p>
                Chaque chauffeur est tenu de disposer d'une assurance responsabilité civile 
                professionnelle couvrant son activité VTC.
              </p>
            </section>

            {/* Article 7 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 7 - Propriété intellectuelle</h2>
              <p>
                L'ensemble des éléments de la plateforme SoloCab (logo, marque, interface, 
                fonctionnalités, code source) sont protégés par les droits de propriété intellectuelle. 
                Toute reproduction ou utilisation non autorisée est interdite.
              </p>
            </section>

            {/* Article 8 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 8 - Suspension et résiliation</h2>
              <p>SoloCab se réserve le droit de suspendre ou résilier un compte en cas de :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Non-respect des présentes CGU</li>
                <li>Comportement frauduleux ou abusif</li>
                <li>Fourniture d'informations fausses</li>
                <li>Non-paiement de l'abonnement (pour les chauffeurs)</li>
                <li>Plaintes répétées d'autres utilisateurs</li>
              </ul>
            </section>

            {/* Article 9 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 9 - Protection des données</h2>
              <p>
                Le traitement des données personnelles est régi par notre Politique de Confidentialité, 
                accessible depuis la plateforme. SoloCab s'engage à respecter le Règlement Général 
                sur la Protection des Données (RGPD).
              </p>
            </section>

            {/* Article 10 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 10 - Litiges et droit applicable</h2>
              <p>
                Les présentes CGU sont régies par le droit français. En cas de litige, les parties 
                s'efforceront de trouver une solution amiable. À défaut, les tribunaux français 
                seront seuls compétents.
              </p>
              <p>
                Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir 
                gratuitement au service de médiation.
              </p>
            </section>

            {/* Article 11 - Règlement financier */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 11 - Règlement financier et frais</h2>
              <p>
                SoloCab applique des frais de gestion transparents pour assurer le fonctionnement 
                de la plateforme :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                 <li><strong>Frais de gestion standard</strong> : 0,50€ par course (espèces ou carte bancaire)</li>
                 <li><strong>Frais de transaction partage</strong> : 0,25€ par chauffeur par course partagée (expéditeur + receveur)</li>
                 <li><strong>Frais d'encaissement spontané</strong> : 0,80€ par paiement spontané via la plateforme</li>
              </ul>
              <p>
                <strong>Règlement hebdomadaire</strong> : afin de minimiser les frais de transaction pour les chauffeurs,
                SoloCab agrège l'ensemble des commissions et frais sur une semaine civile (lundi à dimanche). 
                Un versement net unique est effectué chaque lundi sur le compte Stripe Connect du chauffeur. 
                Ce système réduit considérablement les frais bancaires par rapport à un règlement par transaction.
              </p>
              <p>
                SoloCab ne prélève <strong>aucune commission</strong> sur le montant des courses. 
                Les montants mentionnés ci-dessus sont exclusivement des frais de gestion et de transaction.
              </p>
            </section>

            {/* Article 12 - Modifications des CGU */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 12 - Modifications des CGU</h2>
              <p>
                SoloCab se réserve le droit de modifier les présentes CGU à tout moment. 
                Les utilisateurs seront informés des modifications importantes. La poursuite 
                de l'utilisation de la plateforme vaut acceptation des nouvelles conditions.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Article 13 - Contact</h2>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><strong>SOLOCAB</strong></p>
                <p>Société par actions simplifiée à associé unique (SASU)</p>
                <p>RCS Paris : 994 176 576</p>
                <p>Siège social : 10 rue de Penthièvre, 75008 Paris</p>
                <p>Représentée par Monsieur Kanoute Abdallah, Président</p>
                <p className="pt-2">Email : contact@solocab.fr</p>
                <p>Site web : https://solocab.fr</p>
              </div>
            </section>

          </div>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SoloCab. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

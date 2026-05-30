import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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
            <Shield className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Politique de Confidentialité</h1>
            <p className="text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">
            
            {/* Introduction */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                1. Introduction
              </h2>
              <p>
                SoloCab (ci-après "nous", "notre" ou "la Plateforme") s'engage à protéger la vie privée 
                de ses utilisateurs. Cette politique de confidentialité explique comment nous collectons, 
                utilisons, partageons et protégeons vos informations personnelles lorsque vous utilisez 
                notre application mobile et notre site web.
              </p>
              <p>
                En utilisant SoloCab, vous acceptez les pratiques décrites dans cette politique. 
                Si vous n'acceptez pas ces termes, veuillez ne pas utiliser notre service.
              </p>
            </section>

            {/* Données collectées */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                2. Données que nous collectons
              </h2>
              
              <h3 className="text-lg font-medium">2.1 Informations fournies par vous</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Informations d'inscription :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                <li><strong>Pour les chauffeurs :</strong> numéro de licence VTC, SIRET, informations sur le véhicule, documents professionnels (carte VTC, assurance)</li>
                <li><strong>Pour les entreprises :</strong> raison sociale, numéro SIRET, adresse de facturation</li>
                <li><strong>Informations de paiement :</strong> traitées de manière sécurisée via Stripe (nous ne stockons pas vos données bancaires)</li>
              </ul>

              <h3 className="text-lg font-medium">2.2 Informations collectées automatiquement</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Données de géolocalisation (clients) :</strong> position GPS utilisée ponctuellement pour calculer les itinéraires, les tarifs et suivre la course en cours.</li>
                <li><strong>Données techniques :</strong> type d'appareil, système d'exploitation, adresse IP</li>
                <li><strong>Données d'utilisation :</strong> pages visitées, fonctionnalités utilisées, historique des courses</li>
              </ul>

              <h3 className="text-lg font-medium" id="background-location">
                2.3 Localisation en arrière-plan (chauffeurs uniquement)
              </h3>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p>
                  L'application SoloCab côté <strong>chauffeur</strong> collecte la position GPS précise
                  (latitude, longitude, vitesse, cap) <strong>y compris lorsque l'application est en
                  arrière-plan, réduite ou que l'écran est éteint</strong> (permission Android{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">ACCESS_BACKGROUND_LOCATION</code>{' '}
                  et permission iOS <em>« Toujours »</em>).
                </p>
                <p>
                  <strong>Pourquoi :</strong> sans cette collecte continue, le chauffeur cesserait de
                  recevoir les nouvelles courses dès qu'il verrouille son téléphone ou ouvre une
                  application de navigation (Google Maps, Waze), et le client ne pourrait plus suivre
                  l'arrivée de son véhicule en temps réel sur la carte.
                </p>
                <p>
                  <strong>Quand exactement :</strong> uniquement lorsque le chauffeur est
                  <em> « En ligne »</em> ou qu'une course est en cours. <strong>Aucune position n'est
                  collectée lorsque le chauffeur est hors ligne.</strong> Le passage hors ligne se fait
                  d'un seul appui et arrête immédiatement toute collecte.
                </p>
                <p>
                  <strong>Transparence pendant la collecte :</strong> un service de premier plan
                  (<em>foreground service</em>) affiche une notification persistante indiquant que le
                  suivi GPS est actif, conformément aux exigences Android 14+.
                </p>
                <p>
                  <strong>Écran de divulgation préalable (Prominent Disclosure) :</strong> avant tout
                  appel à la boîte de dialogue système d'Android, l'application affiche un écran
                  expliquant clairement ce qui sera collecté, dans quel but, et propose un bouton
                  <em> « Refuser »</em>.
                </p>
                <p>
                  <strong>Comment révoquer :</strong> à tout moment via
                  <em> Réglages Android &gt; Applications &gt; SoloCab &gt; Autorisations &gt; Localisation</em>{' '}
                  (ou <em>Réglages iOS &gt; Confidentialité &gt; Service de localisation</em>), ou
                  simplement en passant <em>« Hors ligne »</em> dans l'application.
                </p>
                <p>
                  <strong>Usage strictement interne :</strong> les positions sont transmises de façon
                  chiffrée (HTTPS/TLS) à nos serveurs européens et utilisées uniquement pour
                  l'attribution des courses, le calcul des itinéraires, le suivi temps réel par le
                  client et la conservation de la trace du trajet à des fins de preuve (réglementation
                  VTC française – LOTI / loi Grandguillaume). <strong>Elles ne sont jamais vendues,
                  louées ni partagées à des tiers à des fins publicitaires.</strong>
                </p>
              </div>
            </section>

            {/* Utilisation des données */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                3. Comment nous utilisons vos données
              </h2>
              <p>Nous utilisons vos informations pour :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fournir et améliorer nos services de mise en relation VTC</li>
                <li>Traiter les réservations et les paiements</li>
                <li>Générer les devis et factures</li>
                <li>Vous envoyer des notifications importantes (confirmations, rappels)</li>
                <li>Assurer la sécurité de la plateforme et prévenir la fraude</li>
                <li>Respecter nos obligations légales</li>
                <li>Améliorer l'expérience utilisateur grâce à l'analyse des données anonymisées</li>
              </ul>
            </section>

            {/* Partage des données */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Partage des données</h2>
              <p>Nous partageons vos données uniquement dans les cas suivants :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Entre chauffeurs et clients :</strong> pour permettre la réalisation des courses (nom, numéro de téléphone si autorisé)</li>
                <li><strong>Prestataires de services :</strong> Stripe (paiements), Resend (emails), Mapbox (géolocalisation)</li>
                <li><strong>Obligations légales :</strong> si requis par la loi ou les autorités compétentes</li>
              </ul>
              <p className="font-medium">
                Nous ne vendons jamais vos données personnelles à des tiers à des fins commerciales.
              </p>
            </section>

            {/* Sécurité */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Sécurité des données</h2>
              <p>Nous mettons en œuvre des mesures de sécurité appropriées :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chiffrement SSL/TLS pour toutes les communications</li>
                <li>Stockage sécurisé des données sur des serveurs conformes aux normes européennes</li>
                <li>Contrôles d'accès stricts (Row Level Security)</li>
                <li>Authentification sécurisée</li>
                <li>Audits de sécurité réguliers</li>
              </ul>
            </section>

            {/* Droits RGPD */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-primary" />
                6. Vos droits (RGPD)
              </h2>
              <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> corriger vos données inexactes ou incomplètes</li>
                <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
              </ul>
              <p>
                Pour exercer ces droits, accédez à la section "Mes données RGPD" dans votre tableau de bord 
                ou contactez-nous à l'adresse indiquée ci-dessous.
              </p>
            </section>

            {/* Conservation */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Conservation des données</h2>
              <p>Nous conservons vos données personnelles :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Données de compte :</strong> pendant la durée de votre utilisation du service + 3 ans après suppression</li>
                <li><strong>Données de facturation :</strong> 10 ans (obligation légale comptable)</li>
                <li><strong>Données de géolocalisation :</strong> 1 an</li>
                <li><strong>Logs techniques :</strong> 1 an</li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Cookies et technologies similaires</h2>
              <p>
                Nous utilisons des cookies et technologies similaires pour améliorer votre expérience, 
                analyser l'utilisation de la plateforme et assurer la sécurité. Vous pouvez gérer vos 
                préférences de cookies dans les paramètres de votre navigateur.
              </p>
            </section>

            {/* Modifications */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Modifications de cette politique</h2>
              <p>
                Nous pouvons mettre à jour cette politique de confidentialité. Toute modification 
                importante vous sera notifiée par email ou via l'application. La date de dernière 
                mise à jour est indiquée en haut de cette page.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                10. Contact
              </h2>
              <p>
                Pour toute question concernant cette politique de confidentialité ou pour exercer 
                vos droits, vous pouvez nous contacter :
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><strong>SOLOCAB</strong></p>
                <p>Société par actions simplifiée à associé unique (SASU)</p>
                <p>RCS Paris : 994 176 576</p>
                <p>Siège social : 10 rue de Penthièvre, 75008 Paris</p>
                <p className="pt-2">Email : contact@solocab.fr</p>
                <p>Site web : https://solocab.fr</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous pouvez également déposer une réclamation auprès de la CNIL (Commission Nationale 
                de l'Informatique et des Libertés) si vous estimez que vos droits ne sont pas respectés.
              </p>
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

export default PrivacyPolicy;

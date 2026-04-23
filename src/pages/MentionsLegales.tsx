import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, FileText, Scale, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const MentionsLegales = () => {
  const navigate = useNavigate();

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
            <Building2 className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Mentions Légales</h1>
            <p className="text-muted-foreground">
              Conformément aux dispositions des articles 6-III et 19 de la Loi n°2004-575 du 21 juin 2004 
              pour la Confiance dans l'économie numérique (LCEN)
            </p>
          </div>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">
            
            {/* Éditeur du site */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                1. Éditeur du site
              </h2>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><strong>Dénomination sociale :</strong> SOLOCAB</p>
                <p><strong>Forme juridique :</strong> Société par actions simplifiée à associé unique (SASU)</p>
                <p><strong>Capital social :</strong> 200,00 euros</p>
                <p><strong>Siège social :</strong> 10 rue de Penthièvre, 75008 Paris</p>
                <p><strong>RCS Paris :</strong> 994 176 576</p>
                <p><strong>Numéro SIRET :</strong> 994 176 576 00011</p>
                <p><strong>Numéro de TVA intracommunautaire :</strong> FR75 994176576</p>
                <p><strong>EUID :</strong> FR7501 994176576</p>
                <p><strong>Date d'immatriculation :</strong> 21 novembre 2025</p>
              </div>
            </section>

            {/* Directeur de la publication */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                2. Directeur de la publication
              </h2>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><strong>Nom :</strong> Monsieur Kanoute Abdallah</p>
                <p><strong>Qualité :</strong> Président de la société SOLOCAB</p>
              </div>
            </section>

            {/* Hébergement */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                3. Hébergement
              </h2>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><strong>Hébergeur :</strong> Lovable Cloud / Supabase</p>
                <p>Infrastructure cloud sécurisée et conforme aux normes européennes.</p>
                <p>Les données sont hébergées sur des serveurs situés dans l'Union Européenne.</p>
              </div>
            </section>

            {/* Activité */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                4. Activité de l'entreprise
              </h2>
              <p>
                SOLOCAB exerce une activité de prestations de conseil en gestion, organisation, 
                stratégie et optimisation des performances.
              </p>
              <p>
                La plateforme SoloCab est un service de mise en relation entre des chauffeurs VTC 
                indépendants et des clients particuliers ou professionnels, sans frais de transaction sur les courses.
              </p>
            </section>

            {/* Propriété intellectuelle */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                5. Propriété intellectuelle
              </h2>
              <p>
                L'ensemble du contenu de ce site (textes, images, vidéos, logos, marques, graphismes, 
                icônes, logiciels, code source) est la propriété exclusive de SOLOCAB ou de ses partenaires, 
                et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
                des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf 
                autorisation écrite préalable de SOLOCAB.
              </p>
              <p>
                La marque "SoloCab" et son logo sont des marques déposées par SOLOCAB. 
                Toute utilisation non autorisée constitue une contrefaçon sanctionnée par les articles 
                L.713-2 et suivants du Code de la propriété intellectuelle.
              </p>
            </section>

            {/* Données personnelles */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Protection des données personnelles</h2>
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la 
                loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez d'un droit 
                d'accès, de rectification, de suppression et de portabilité de vos données personnelles.
              </p>
              <p>
                Pour exercer ces droits ou pour toute question relative au traitement de vos données, 
                vous pouvez nous contacter :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Par email : contact@solocab.fr</li>
                <li>Par courrier : SOLOCAB - 10 rue de Penthièvre, 75008 Paris</li>
              </ul>
              <p>
                Pour en savoir plus sur notre politique de traitement des données personnelles, 
                consultez notre{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline font-medium">
                  Politique de Confidentialité
                </Link>.
              </p>
            </section>

            {/* Cookies */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Cookies</h2>
              <p>
                Le site utilise des cookies pour assurer son bon fonctionnement et améliorer 
                l'expérience utilisateur. Ces cookies sont nécessaires au fonctionnement technique 
                du site et ne collectent pas de données personnelles à des fins publicitaires.
              </p>
              <p>
                Vous pouvez configurer votre navigateur pour refuser les cookies. Toutefois, 
                certaines fonctionnalités du site pourraient ne plus être disponibles.
              </p>
            </section>

            {/* Liens hypertextes */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Liens hypertextes</h2>
              <p>
                Le site peut contenir des liens vers d'autres sites web. SOLOCAB n'exerce aucun 
                contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou 
                leurs pratiques en matière de protection des données.
              </p>
            </section>

            {/* Droit applicable */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Droit applicable et juridiction compétente</h2>
              <p>
                Les présentes mentions légales sont régies par le droit français. En cas de litige 
                et à défaut de solution amiable, les tribunaux français seront seuls compétents.
              </p>
            </section>

            {/* Médiation */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. Médiation de la consommation</h2>
              <p>
                Conformément à l'article L.612-1 du Code de la consommation, le consommateur a la 
                possibilité de recourir gratuitement à un médiateur de la consommation en vue de la 
                résolution amiable d'un litige.
              </p>
              <p>
                Pour toute réclamation, vous pouvez nous contacter à l'adresse contact@solocab.fr. 
                À défaut de résolution amiable, vous pouvez saisir le médiateur de la consommation 
                dont nous relevons.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. Contact</h2>
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
                <p className="font-bold text-lg">SOLOCAB</p>
                <p>10 rue de Penthièvre</p>
                <p>75008 Paris, France</p>
                <p className="pt-2">
                  <strong>Email :</strong> contact@solocab.fr
                </p>
                <p>
                  <strong>Site web :</strong> https://solocab.fr
                </p>
              </div>
            </section>

            {/* Autres documents légaux */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Documents complémentaires</h2>
              <div className="flex flex-wrap gap-4">
                <Link to="/privacy-policy">
                  <Button variant="outline" className="gap-2">
                    <Shield className="w-4 h-4" />
                    Politique de Confidentialité
                  </Button>
                </Link>
                <Link to="/terms-of-service">
                  <Button variant="outline" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Conditions Générales d'Utilisation
                  </Button>
                </Link>
                <Link to="/nos-valeurs">
                  <Button variant="outline" className="gap-2">
                    <Scale className="w-4 h-4" />
                    Nos Valeurs
                  </Button>
                </Link>
              </div>
            </section>

          </div>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SOLOCAB. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export default MentionsLegales;

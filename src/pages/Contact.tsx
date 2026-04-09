import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo-solocab.png";
import { Mail, Phone, MapPin, ArrowLeft, MessageCircle } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      <header className="border-b border-border bg-storefront-dark backdrop-blur-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Contactez-nous
          </h1>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Une question, une suggestion ou besoin d'aide ? Notre équipe est à votre disposition.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-6 bg-muted/20 border-border text-center">
              <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-foreground mb-2">Email</h3>
              <a href="mailto:contact@solocab.fr" className="text-primary hover:underline">
                contact@solocab.fr
              </a>
            </Card>

            <Card className="p-6 bg-muted/20 border-border text-center">
              <MessageCircle className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-foreground mb-2">Support</h3>
              <a href="mailto:support@solocab.fr" className="text-primary hover:underline">
                support@solocab.fr
              </a>
            </Card>
          </div>

          <Card className="p-6 bg-muted/20 border-border text-center">
            <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-2">Adresse</h3>
            <p className="text-muted-foreground">
              SoloCab — France
            </p>
          </Card>
        </div>
      </section>

      <footer className="py-8 border-t border-border bg-storefront-dark">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SoloCab. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;

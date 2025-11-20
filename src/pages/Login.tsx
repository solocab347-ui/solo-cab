import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car } from "lucide-react";
import { Link } from "react-router-dom";

const Login = () => {
  const [role, setRole] = useState<"client" | "driver" | "admin">("client");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-7 h-7 text-primary" />
            </div>
            <span className="text-3xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Bienvenue</h1>
          <p className="text-muted-foreground mt-2">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        <Card className="p-6 shadow-elegant">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="transition-all focus:shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="transition-all focus:shadow-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-muted-foreground">Se souvenir</span>
                </label>
                <a href="#" className="text-premium hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <Button className="w-full bg-gradient-premium hover:opacity-90 transition-opacity">
                Se connecter
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label>Je suis un...</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={role === "client" ? "default" : "outline"}
                    onClick={() => setRole("client")}
                    className={role === "client" ? "bg-gradient-premium" : ""}
                  >
                    Client
                  </Button>
                  <Button
                    type="button"
                    variant={role === "driver" ? "default" : "outline"}
                    onClick={() => setRole("driver")}
                    className={role === "driver" ? "bg-gradient-premium" : ""}
                  >
                    Chauffeur
                  </Button>
                  <Button
                    type="button"
                    variant={role === "admin" ? "default" : "outline"}
                    onClick={() => setRole("admin")}
                    className={role === "admin" ? "bg-gradient-premium" : ""}
                  >
                    Admin
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nom complet</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Jean Dupont"
                  className="transition-all focus:shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="votre@email.com"
                  className="transition-all focus:shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  className="transition-all focus:shadow-sm"
                />
              </div>
              {role === "driver" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="license">Numéro de permis</Label>
                    <Input
                      id="license"
                      type="text"
                      placeholder="123456789"
                      className="transition-all focus:shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Véhicule</Label>
                    <Input
                      id="vehicle"
                      type="text"
                      placeholder="Mercedes Classe E"
                      className="transition-all focus:shadow-sm"
                    />
                  </div>
                </>
              )}
              <Button className="w-full bg-gradient-premium hover:opacity-90 transition-opacity">
                Créer mon compte
              </Button>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          En continuant, vous acceptez nos{" "}
          <a href="#" className="text-premium hover:underline">
            conditions d'utilisation
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;

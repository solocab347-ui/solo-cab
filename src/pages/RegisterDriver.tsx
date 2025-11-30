import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const RegisterDriver = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Vérifier la présence d'un token d'invitation
  const token = searchParams.get("token");

  useEffect(() => {
    // Si pas de token, rediriger vers la page d'inscription publique avec promotion
    if (!token) {
      navigate("/register-driver-promo", { replace: true });
      return;
    }

    // Si token présent, TODO: implémenter le formulaire d'inscription avec token
    console.log("Token d'invitation détecté:", token);
  }, [token, navigate]);

  // Si pas de token, ne rien afficher (redirection en cours)
  if (!token) {
    return null;
  }

  // TODO: Implémenter le formulaire d'inscription en 3 étapes
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Inscription Chauffeur</h1>
        <p className="text-muted-foreground mb-4">
          Token d'invitation valide détecté. Le formulaire d'inscription complet sera disponible prochainement.
        </p>
        <p className="text-sm text-muted-foreground">Token: {token}</p>
      </div>
    </div>
  );
};

export default RegisterDriver;

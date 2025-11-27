import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RegisterDriver = () => {
  const navigate = useNavigate();

  // BLOQUER TOUTES LES INSCRIPTIONS - Redirection immédiate
  useEffect(() => {
    navigate("/pioneer-test");
  }, [navigate]);

  return null;
};

export default RegisterDriver;

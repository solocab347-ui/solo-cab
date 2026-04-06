import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy route — redirects to the unified booking page in immediate mode.
 */
const ImmediateRide = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/chauffeurs?mode=immediate', { replace: true });
  }, [navigate]);

  return null;
};

export default ImmediateRide;

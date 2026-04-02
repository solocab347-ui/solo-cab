import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SavedCardInfo {
  id: string;
  brand: string;
  last4: string;
  is_default: boolean;
}

export function useClientSavedCard() {
  const [cards, setCards] = useState<SavedCardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCard, setHasCard] = useState(false);
  const [defaultCard, setDefaultCard] = useState<SavedCardInfo | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("list-client-cards");
      if (error) throw error;
      
      const cardsList = data?.cards || [];
      setCards(cardsList);
      setHasCard(cardsList.length > 0);
      setDefaultCard(cardsList.find((c: SavedCardInfo) => c.is_default) || cardsList[0] || null);
    } catch {
      setCards([]);
      setHasCard(false);
      setDefaultCard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  return {
    cards,
    loading,
    hasCard,
    defaultCard,
    refresh: loadCards,
  };
}

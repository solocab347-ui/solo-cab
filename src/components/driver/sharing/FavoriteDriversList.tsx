import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Heart, Search, Trash2, UserPlus, Hash, Star, Car, Phone, 
  CheckCircle2, XCircle, Loader2
} from 'lucide-react';

interface FavoriteDriver {
  id: string;
  favorite_driver_id: string;
  created_at: string;
  name: string;
  photo: string | null;
  company: string | null;
  sharing_number: number | null;
  rating: number;
  rides: number;
  has_stripe: boolean;
  show_rating: boolean;
  show_rides: boolean;
  show_phone: boolean;
  phone: string | null;
}

export function FavoriteDriversList() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user?.id) loadDriver();
  }, [user?.id]);

  const loadDriver = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user?.id)
      .single();
    if (data) {
      setDriverId(data.id);
      await loadFavorites(data.id);
    }
    setLoading(false);
  };

  const loadFavorites = async (did: string) => {
    const { data, error } = await supabase
      .from('driver_favorites')
      .select('id, favorite_driver_id, created_at')
      .eq('driver_id', did);

    if (error) { console.error(error); return; }

    const enriched: FavoriteDriver[] = [];
    for (const fav of data || []) {
      const { data: d } = await supabase
        .from('drivers')
        .select('user_id, company_name, sharing_number, rating, total_rides, card_photo_url, contact_phone, show_phone_for_sharing, show_rating_for_sharing, show_rides_for_sharing, stripe_connect_account_id, stripe_connect_status')
        .eq('id', fav.favorite_driver_id)
        .single();

      if (d) {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, profile_photo_url, phone')
          .eq('id', d.user_id)
          .single();

        enriched.push({
          id: fav.id,
          favorite_driver_id: fav.favorite_driver_id,
          created_at: fav.created_at,
          name: p?.full_name?.split(' ')[0] || 'Chauffeur',
          photo: d.card_photo_url || p?.profile_photo_url || null,
          company: d.company_name,
          sharing_number: d.sharing_number,
          rating: d.rating || 0,
          rides: d.total_rides || 0,
          has_stripe: !!d.stripe_connect_account_id && d.stripe_connect_status === 'active',
          show_rating: true, // Rating always visible
          show_rides: d.show_rides_for_sharing ?? false,
          show_phone: d.show_phone_for_sharing ?? false,
          phone: d.show_phone_for_sharing ? (d.contact_phone || p?.phone) : null,
        });
      }
    }
    setFavorites(enriched);
  };

  const addFavoriteByCode = async () => {
    if (!driverId || !searchCode.trim()) return;
    setSearching(true);

    try {
      // Parse SOLO-XXXXXX format
      const codeMatch = searchCode.trim().match(/SOLO-?(\d+)/i);
      const sharingNum = codeMatch ? parseInt(codeMatch[1]) : parseInt(searchCode.trim());

      if (isNaN(sharingNum)) {
        toast.error('Format invalide. Utilisez SOLO-XXXXXX');
        setSearching(false);
        return;
      }

      const { data: targetDriver } = await supabase
        .from('drivers')
        .select('id, stripe_connect_status')
        .eq('sharing_number', sharingNum)
        .single();

      if (!targetDriver) {
        toast.error('Aucun chauffeur trouvé avec ce numéro');
        setSearching(false);
        return;
      }

      if (targetDriver.id === driverId) {
        toast.error('Vous ne pouvez pas vous ajouter vous-même');
        setSearching(false);
        return;
      }

      const { error } = await supabase.from('driver_favorites').insert({
        driver_id: driverId,
        favorite_driver_id: targetDriver.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce chauffeur est déjà dans vos favoris');
        } else {
          throw error;
        }
      } else {
        toast.success('Chauffeur ajouté à vos favoris !');
        setSearchCode('');
        await loadFavorites(driverId);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSearching(false);
    }
  };

  const removeFavorite = async (favId: string) => {
    const { error } = await supabase.from('driver_favorites').delete().eq('id', favId);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Chauffeur retiré des favoris');
      setFavorites(prev => prev.filter(f => f.id !== favId));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Add favorite */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Ajouter un favori
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="SOLO-XXXXXX"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && addFavoriteByCode()}
            />
            <Button onClick={addFavoriteByCode} disabled={searching || !searchCode.trim()} size="icon">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Entrez le numéro de partage du chauffeur pour l'ajouter à vos favoris
          </p>
        </CardContent>
      </Card>

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <Alert>
          <Heart className="h-4 w-4" />
          <AlertDescription>
            Aucun chauffeur favori. Ajoutez des chauffeurs pour leur envoyer des courses en priorité.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => (
            <Card key={fav.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={fav.photo || undefined} />
                    <AvatarFallback>{fav.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{fav.name}</p>
                      {fav.has_stripe ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                    </div>
                    {fav.company && <p className="text-xs text-muted-foreground truncate">{fav.company}</p>}
                    <div className="flex items-center gap-1 text-primary font-mono text-xs">
                      <Hash className="w-3 h-3" />
                      SOLO-{String(fav.sharing_number).padStart(6, '0')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {fav.show_rating && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-500" />{fav.rating.toFixed(1)}</span>}
                      {fav.show_rides && <span className="flex items-center gap-0.5"><Car className="w-3 h-3" />{fav.rides}</span>}
                      {fav.show_phone && fav.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{fav.phone}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeFavorite(fav.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!fav.has_stripe && (
                  <p className="text-xs text-destructive mt-2">⚠️ Stripe Connect non actif – Ne peut pas recevoir de courses</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

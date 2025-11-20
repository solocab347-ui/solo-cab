import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Users as UsersIcon } from "lucide-react";
import Pagination from "@/components/Pagination";

const UsersList = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter((user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          *,
          drivers:drivers!inner(id, status),
          clients:clients!inner(id, is_exclusive)
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            user_roles: roles?.map((r) => r.role) || [],
          };
        })
      );

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes("admin")) {
      return <Badge className="bg-purple-500">Admin</Badge>;
    }
    if (roles.includes("driver")) {
      return <Badge className="bg-blue-500">Chauffeur</Badge>;
    }
    if (roles.includes("client")) {
      return <Badge className="bg-green-500">Client</Badge>;
    }
    return <Badge variant="outline">Aucun rôle</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {paginatedUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <UsersIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun utilisateur trouvé</h3>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedUsers.map((user) => (
              <Card key={user.id} className="p-6">
                <div className="flex items-start gap-4">
                  {user.profile_photo_url ? (
                    <img
                      src={user.profile_photo_url}
                      alt={user.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                      <UsersIcon className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{user.full_name}</h3>
                      {getRoleBadge(user.user_roles)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                    {user.phone && (
                      <p className="text-sm text-muted-foreground">📞 {user.phone}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {user.drivers && (
                        <Badge variant="outline">
                          Chauffeur: {user.drivers.status}
                        </Badge>
                      )}
                      {user.clients && (
                        <Badge variant="outline">
                          {user.clients.is_exclusive ? "Client Exclusif" : "Client Libre"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
          />
        </>
      )}
    </div>
  );
};

export default UsersList;

/**
 * Page Mode Sans Échec - Consultation offline des données critiques
 * Accessible même hors ligne, affiche les données du cache local
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Users, 
  Car, 
  Phone, 
  MapPin, 
  Calendar,
  Search,
  WifiOff,
  Wifi,
  Clock,
  Euro,
  User,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOfflineData } from '@/hooks/useOfflineData';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SafeMode = () => {
  const navigate = useNavigate();
  const { 
    isOnline, 
    isOfflineMode, 
    lastSync, 
    isSyncing, 
    syncNow,
    clients, 
    courses, 
    driverProfile,
    myDrivers,
    fleetDrivers,
    companyEmployees,
    stats 
  } = useOfflineData();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('courses');

  // Déterminer les onglets disponibles
  const hasClients = clients.length > 0;
  const hasMyDrivers = myDrivers.length > 0;
  const hasFleetDrivers = fleetDrivers.length > 0;
  const hasEmployees = companyEmployees.length > 0;

  // Filtrage des courses
  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courses;
    const term = searchTerm.toLowerCase();
    return courses.filter(c => 
      c.pickup_address?.toLowerCase().includes(term) ||
      c.destination_address?.toLowerCase().includes(term) ||
      c.client_name?.toLowerCase().includes(term) ||
      c.driver_name?.toLowerCase().includes(term) ||
      c.guest_name?.toLowerCase().includes(term) ||
      c.guest_phone?.includes(term) ||
      c.driver_phone?.includes(term) ||
      c.status?.toLowerCase().includes(term)
    );
  }, [courses, searchTerm]);

  // Filtrage des clients
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.full_name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  // Filtrage des chauffeurs (pour clients ou collaborateurs)
  const filteredMyDrivers = useMemo(() => {
    if (!searchTerm) return myDrivers;
    const term = searchTerm.toLowerCase();
    return myDrivers.filter(d => 
      d.display_name?.toLowerCase().includes(term) ||
      d.phone?.includes(term) ||
      d.company_name?.toLowerCase().includes(term)
    );
  }, [myDrivers, searchTerm]);

  // Filtrage des chauffeurs de flotte
  const filteredFleetDrivers = useMemo(() => {
    if (!searchTerm) return fleetDrivers;
    const term = searchTerm.toLowerCase();
    return fleetDrivers.filter(d => 
      d.driver_name?.toLowerCase().includes(term) ||
      d.driver_phone?.includes(term)
    );
  }, [fleetDrivers, searchTerm]);

  // Filtrage des collaborateurs
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return companyEmployees;
    const term = searchTerm.toLowerCase();
    return companyEmployees.filter(e => 
      e.employee_name?.toLowerCase().includes(term) ||
      e.phone?.includes(term) ||
      e.department?.toLowerCase().includes(term)
    );
  }, [companyEmployees, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      case 'scheduled': return 'Programmée';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixe */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <h1 className="font-semibold">Mode Sans Échec</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? (
                <><Wifi className="h-3 w-3 mr-1" /> En ligne</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Hors ligne</>
              )}
            </Badge>
            {isOnline && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4">
        {/* Avertissement mode offline */}
        {isOfflineMode && (
          <Card className="border-orange-500 bg-orange-500/10">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-500">Mode consultation uniquement</p>
                <p className="text-sm text-muted-foreground">
                  Vous êtes hors ligne. Les données affichées proviennent du cache local.
                  Les actions (appels, navigation) ne fonctionneront pas.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Car className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.courses}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.clients}</p>
              <p className="text-xs text-muted-foreground">Clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <User className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.drivers}</p>
              <p className="text-xs text-muted-foreground">Chauffeurs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">
                {lastSync ? format(lastSync, 'HH:mm', { locale: fr }) : '--:--'}
              </p>
              <p className="text-xs text-muted-foreground">Sync</p>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, adresse, téléphone...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Onglets dynamiques selon le type d'utilisateur */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="courses" className="flex items-center gap-1 flex-1">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Courses</span>
              <Badge variant="secondary" className="ml-1">{filteredCourses.length}</Badge>
            </TabsTrigger>
            
            {hasClients && (
              <TabsTrigger value="clients" className="flex items-center gap-1 flex-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clients</span>
                <Badge variant="secondary" className="ml-1">{filteredClients.length}</Badge>
              </TabsTrigger>
            )}
            
            {hasMyDrivers && (
              <TabsTrigger value="drivers" className="flex items-center gap-1 flex-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Chauffeurs</span>
                <Badge variant="secondary" className="ml-1">{filteredMyDrivers.length}</Badge>
              </TabsTrigger>
            )}
            
            {hasFleetDrivers && (
              <TabsTrigger value="fleet" className="flex items-center gap-1 flex-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Flotte</span>
                <Badge variant="secondary" className="ml-1">{filteredFleetDrivers.length}</Badge>
              </TabsTrigger>
            )}

            {hasEmployees && (
              <TabsTrigger value="employees" className="flex items-center gap-1 flex-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Équipe</span>
                <Badge variant="secondary" className="ml-1">{filteredEmployees.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Liste des courses */}
          <TabsContent value="courses" className="mt-4">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3">
                {filteredCourses.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Aucune course en cache</p>
                      {isOnline && (
                        <Button variant="link" onClick={syncNow} className="mt-2">
                          Synchroniser maintenant
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredCourses.map((course) => (
                    <Card key={course.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(course.status)}`} />
                            <span className="text-sm font-medium">
                              {getStatusLabel(course.status)}
                            </span>
                          </div>
                          {course.price && (
                            <Badge variant="outline">
                              <Euro className="h-3 w-3 mr-1" />
                              {course.price.toFixed(2)}€
                            </Badge>
                          )}
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {course.client_name || course.guest_name || 'Client anonyme'}
                          </span>
                          {course.guest_phone && (
                            <a 
                              href={`tel:${course.guest_phone}`}
                              className="text-primary hover:underline ml-auto"
                              onClick={(e) => !isOnline && e.preventDefault()}
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>

                        {/* Adresses */}
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{course.pickup_address}</span>
                          </div>
                          {course.destination_address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{course.destination_address}</span>
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        {course.scheduled_date && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(course.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Liste des clients */}
          <TabsContent value="clients" className="mt-4">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3">
                {filteredClients.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Aucun client en cache</p>
                      {isOnline && (
                        <Button variant="link" onClick={syncNow} className="mt-2">
                          Synchroniser maintenant
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredClients.map((client) => (
                    <Card key={client.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{client.full_name}</p>
                              {client.phone && (
                                <p className="text-sm text-muted-foreground">{client.phone}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {client.is_exclusive && (
                              <Badge variant="secondary" className="text-xs">Exclusif</Badge>
                            )}
                            {client.phone && (
                              <a
                                href={`tel:${client.phone}`}
                                onClick={(e) => !isOnline && e.preventDefault()}
                              >
                                <Button size="icon" variant="outline" className="h-8 w-8">
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                          {client.total_rides !== undefined && (
                            <span><Car className="h-3 w-3 inline mr-1" />{client.total_rides} courses</span>
                          )}
                          {client.total_spent !== undefined && (
                            <span><Euro className="h-3 w-3 inline mr-1" />{client.total_spent?.toFixed(0)}€</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Liste des chauffeurs (pour clients/collaborateurs) */}
          <TabsContent value="drivers" className="mt-4">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3">
                {filteredMyDrivers.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Aucun chauffeur en cache</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredMyDrivers.map((driver) => (
                    <Card key={driver.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{driver.display_name || driver.company_name || 'Chauffeur'}</p>
                              {driver.phone && (
                                <p className="text-sm text-muted-foreground">{driver.phone}</p>
                              )}
                              {driver.vehicle_model && (
                                <p className="text-xs text-muted-foreground">
                                  {driver.vehicle_model} {driver.vehicle_color && `- ${driver.vehicle_color}`}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {driver.phone && (
                            <a
                              href={`tel:${driver.phone}`}
                              onClick={(e) => !isOnline && e.preventDefault()}
                            >
                              <Button size="icon" variant="outline" className="h-8 w-8">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Liste des chauffeurs de flotte */}
          <TabsContent value="fleet" className="mt-4">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3">
                {filteredFleetDrivers.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Aucun chauffeur en cache</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredFleetDrivers.map((driver) => (
                    <Card key={driver.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{driver.driver_name || 'Chauffeur'}</p>
                              {driver.driver_phone && (
                                <p className="text-sm text-muted-foreground">{driver.driver_phone}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                              {driver.status === 'active' ? 'Actif' : driver.status}
                            </Badge>
                            {driver.driver_phone && (
                              <a
                                href={`tel:${driver.driver_phone}`}
                                onClick={(e) => !isOnline && e.preventDefault()}
                              >
                                <Button size="icon" variant="outline" className="h-8 w-8">
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Liste des collaborateurs */}
          <TabsContent value="employees" className="mt-4">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3">
                {filteredEmployees.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Aucun collaborateur en cache</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredEmployees.map((employee) => (
                    <Card key={employee.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{employee.employee_name || 'Collaborateur'}</p>
                              {employee.department && (
                                <p className="text-sm text-muted-foreground">{employee.department}</p>
                              )}
                              {employee.job_title && (
                                <p className="text-xs text-muted-foreground">{employee.job_title}</p>
                              )}
                            </div>
                          </div>
                          
                          {employee.phone && (
                            <a
                              href={`tel:${employee.phone}`}
                              onClick={(e) => !isOnline && e.preventDefault()}
                            >
                              <Button size="icon" variant="outline" className="h-8 w-8">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SafeMode;

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DispatchSettings {
  auto_dispatch_enabled: boolean;
  dispatch_priority: "proximity" | "availability" | "rating";
  dispatch_driver_priority: "internal_first" | "external_first" | "balanced";
  dispatch_notification_mode: "sequential" | "broadcast";
  dispatch_timeout_minutes: number;
  favorite_driver_priority: boolean;
}

interface CreateDispatchParams {
  fleetManagerId: string;
  clientId: string;
  pickupAddress: string;
  destinationAddress: string;
  scheduledDate: string;
  passengersCount?: number;
  notes?: string;
  selectedDriverId?: string;
}

export const useFleetDispatch = () => {
  const [loading, setLoading] = useState(false);

  // Récupérer les paramètres de dispatch du gestionnaire
  const getDispatchSettings = useCallback(async (fleetManagerId: string): Promise<DispatchSettings | null> => {
    const { data, error } = await supabase
      .from("fleet_managers")
      .select(`
        auto_dispatch_enabled,
        dispatch_priority,
        dispatch_driver_priority,
        dispatch_notification_mode,
        dispatch_timeout_minutes,
        favorite_driver_priority
      `)
      .eq("id", fleetManagerId)
      .single();

    if (error) {
      console.error("Error fetching dispatch settings:", error);
      return null;
    }

    return {
      auto_dispatch_enabled: data.auto_dispatch_enabled ?? false,
      dispatch_priority: (data.dispatch_priority as any) || "proximity",
      dispatch_driver_priority: (data.dispatch_driver_priority as any) || "internal_first",
      dispatch_notification_mode: (data.dispatch_notification_mode as any) || "sequential",
      dispatch_timeout_minutes: data.dispatch_timeout_minutes || 5,
      favorite_driver_priority: data.favorite_driver_priority !== false,
    };
  }, []);

  // Récupérer les chauffeurs disponibles selon la priorité
  const getAvailableDrivers = useCallback(async (
    fleetManagerId: string,
    settings: DispatchSettings,
    clientFavoriteDriverId?: string | null
  ) => {
    // Chauffeurs internes
    const { data: internalDrivers } = await supabase
      .from("fleet_manager_drivers")
      .select(`
        driver_id,
        driver:drivers(
          id,
          user_id,
          status,
          rating,
          max_passengers
        )
      `)
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    // Partenaires externes
    const { data: partnerDrivers } = await supabase
      .from("fleet_driver_partnerships")
      .select(`
        driver_id,
        driver:drivers(
          id,
          user_id,
          status,
          rating,
          max_passengers
        )
      `)
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "accepted");

    // Filtrer les chauffeurs actifs (status = 'active' ou 'validated')
    const internal = (internalDrivers || [])
      .filter((d: any) => d.driver && ["active", "validated"].includes(d.driver.status))
      .map((d: any) => ({ ...d.driver, isInternal: true }));

    const external = (partnerDrivers || [])
      .filter((d: any) => d.driver && ["active", "validated"].includes(d.driver.status))
      .map((d: any) => ({ ...d.driver, isInternal: false }));

    let allDrivers: any[] = [];

    // Prioriser le chauffeur favori du client
    if (settings.favorite_driver_priority && clientFavoriteDriverId) {
      const favoriteDriver = [...internal, ...external].find(d => d.id === clientFavoriteDriverId);
      if (favoriteDriver) {
        allDrivers.push(favoriteDriver);
      }
    }

    // Appliquer la priorité interne/externe
    switch (settings.dispatch_driver_priority) {
      case "internal_first":
        allDrivers = [...allDrivers, ...internal.filter(d => d.id !== clientFavoriteDriverId)];
        allDrivers = [...allDrivers, ...external.filter(d => d.id !== clientFavoriteDriverId)];
        break;
      case "external_first":
        allDrivers = [...allDrivers, ...external.filter(d => d.id !== clientFavoriteDriverId)];
        allDrivers = [...allDrivers, ...internal.filter(d => d.id !== clientFavoriteDriverId)];
        break;
      case "balanced":
        const merged = [...internal, ...external]
          .filter(d => d.id !== clientFavoriteDriverId)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0));
        allDrivers = [...allDrivers, ...merged];
        break;
    }

    // Trier par critère de dispatch
    if (settings.dispatch_priority === "rating") {
      allDrivers = allDrivers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Retirer les doublons
    const uniqueDrivers = allDrivers.filter(
      (driver, index, self) => index === self.findIndex(d => d.id === driver.id)
    );

    return uniqueDrivers;
  }, []);

  // Créer une demande de dispatch
  const createDispatch = useCallback(async (params: CreateDispatchParams) => {
    setLoading(true);
    try {
      const settings = await getDispatchSettings(params.fleetManagerId);
      if (!settings) throw new Error("Impossible de récupérer les paramètres");

      // Si dispatch manuel ou chauffeur déjà sélectionné
      if (!settings.auto_dispatch_enabled || params.selectedDriverId) {
        // Créer directement la course
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .insert({
            client_id: params.clientId,
            driver_id: params.selectedDriverId || null,
            pickup_address: params.pickupAddress,
            destination_address: params.destinationAddress,
            scheduled_date: params.scheduledDate,
            passengers_count: params.passengersCount || 1,
            notes: params.notes,
            status: params.selectedDriverId ? "pending" : "pending",
            fleet_manager_id: params.fleetManagerId,
          })
          .select()
          .single();

        if (courseError) throw courseError;

        // Si pas de chauffeur, créer une entrée dans la queue pour dispatch manuel
        if (!params.selectedDriverId) {
          await supabase.from("fleet_dispatch_queue").insert({
            fleet_manager_id: params.fleetManagerId,
            course_id: course.id,
            client_id: params.clientId,
            pickup_address: params.pickupAddress,
            destination_address: params.destinationAddress,
            scheduled_date: params.scheduledDate,
            passengers_count: params.passengersCount || 1,
            notes: params.notes,
            status: "manual",
            dispatch_mode: "manual",
          });
        }

        return { success: true, course, mode: "manual" };
      }

      // Dispatch automatique
      // Récupérer le client pour le chauffeur favori
      const { data: client } = await supabase
        .from("clients")
        .select("favorite_driver_id, preferred_fleet_driver_id")
        .eq("id", params.clientId)
        .single();

      const favoriteDriverId = client?.preferred_fleet_driver_id || client?.favorite_driver_id;
      const availableDrivers = await getAvailableDrivers(params.fleetManagerId, settings, favoriteDriverId);

      if (availableDrivers.length === 0) {
        // Aucun chauffeur disponible, créer en mode manuel
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .insert({
            client_id: params.clientId,
            pickup_address: params.pickupAddress,
            destination_address: params.destinationAddress,
            scheduled_date: params.scheduledDate,
            passengers_count: params.passengersCount || 1,
            notes: params.notes,
            status: "pending",
            fleet_manager_id: params.fleetManagerId,
          })
          .select()
          .single();

        if (courseError) throw courseError;

        await supabase.from("fleet_dispatch_queue").insert({
          fleet_manager_id: params.fleetManagerId,
          course_id: course.id,
          client_id: params.clientId,
          pickup_address: params.pickupAddress,
          destination_address: params.destinationAddress,
          scheduled_date: params.scheduledDate,
          passengers_count: params.passengersCount || 1,
          notes: params.notes,
          status: "pending",
          dispatch_mode: "automatic",
        });

        toast.warning("Aucun chauffeur disponible, course en attente d'assignation");
        return { success: true, course, mode: "pending" };
      }

      // Créer la course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: params.clientId,
          pickup_address: params.pickupAddress,
          destination_address: params.destinationAddress,
          scheduled_date: params.scheduledDate,
          passengers_count: params.passengersCount || 1,
          notes: params.notes,
          status: "pending",
          fleet_manager_id: params.fleetManagerId,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Créer la demande de dispatch
      const timeoutAt = new Date();
      timeoutAt.setMinutes(timeoutAt.getMinutes() + settings.dispatch_timeout_minutes);

      const firstDriver = availableDrivers[0];

      const { data: dispatch, error: dispatchError } = await supabase
        .from("fleet_dispatch_queue")
        .insert({
          fleet_manager_id: params.fleetManagerId,
          course_id: course.id,
          client_id: params.clientId,
          pickup_address: params.pickupAddress,
          destination_address: params.destinationAddress,
          scheduled_date: params.scheduledDate,
          passengers_count: params.passengersCount || 1,
          notes: params.notes,
          status: "dispatching",
          dispatch_mode: "automatic",
          current_driver_id: settings.dispatch_notification_mode === "sequential" ? firstDriver.id : null,
          notified_driver_ids: settings.dispatch_notification_mode === "broadcast" 
            ? availableDrivers.map((d: any) => d.id) 
            : [firstDriver.id],
          timeout_at: timeoutAt.toISOString(),
        })
        .select()
        .single();

      if (dispatchError) throw dispatchError;

      // Créer les notifications pour les chauffeurs
      const driversToNotify = settings.dispatch_notification_mode === "broadcast" 
        ? availableDrivers 
        : [firstDriver];

      for (const driver of driversToNotify) {
        await supabase.from("fleet_dispatch_responses").insert({
          dispatch_id: dispatch.id,
          driver_id: driver.id,
          notified_at: new Date().toISOString(),
        });
      }

      return { success: true, course, dispatch, mode: "automatic" };

    } catch (error) {
      console.error("Error creating dispatch:", error);
      toast.error("Erreur lors de la création du dispatch");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [getDispatchSettings, getAvailableDrivers]);

  // Répondre à une demande de dispatch (côté chauffeur)
  const respondToDispatch = useCallback(async (
    dispatchId: string,
    driverId: string,
    response: "accepted" | "declined",
    declineReason?: string
  ) => {
    setLoading(true);
    try {
      // Mettre à jour la réponse
      const { error: responseError } = await supabase
        .from("fleet_dispatch_responses")
        .update({
          response,
          decline_reason: declineReason,
          responded_at: new Date().toISOString(),
        })
        .eq("dispatch_id", dispatchId)
        .eq("driver_id", driverId);

      if (responseError) throw responseError;

      if (response === "accepted") {
        // Récupérer le dispatch
        const { data: dispatch } = await supabase
          .from("fleet_dispatch_queue")
          .select("course_id")
          .eq("id", dispatchId)
          .single();

        if (dispatch?.course_id) {
          // Mettre à jour la course
          await supabase
            .from("courses")
            .update({ driver_id: driverId, status: "accepted" })
            .eq("id", dispatch.course_id);

          // Mettre à jour le dispatch
          await supabase
            .from("fleet_dispatch_queue")
            .update({
              status: "assigned",
              assigned_driver_id: driverId,
              assigned_at: new Date().toISOString(),
            })
            .eq("id", dispatchId);
        }

        toast.success("Course acceptée !");
      } else {
        // Ajouter aux chauffeurs refusés
        const { data: dispatch } = await supabase
          .from("fleet_dispatch_queue")
          .select("*")
          .eq("id", dispatchId)
          .single();

        if (dispatch) {
          const declinedIds = [...(dispatch.declined_driver_ids || []), driverId];
          
          // Passer au chauffeur suivant si mode séquentiel
          if (dispatch.dispatch_mode === "automatic") {
            // Vérifier s'il reste des chauffeurs à notifier
            const notifiedIds = dispatch.notified_driver_ids || [];
            const remainingNotified = notifiedIds.filter((id: string) => 
              !declinedIds.includes(id) && id !== driverId
            );

            if (remainingNotified.length === 0) {
              // Plus de chauffeurs disponibles
              await supabase
                .from("fleet_dispatch_queue")
                .update({
                  status: "expired",
                  declined_driver_ids: declinedIds,
                  current_driver_id: null,
                })
                .eq("id", dispatchId);

              toast.info("Tous les chauffeurs ont refusé, course en attente manuelle");
            } else {
              // Passer au suivant
              await supabase
                .from("fleet_dispatch_queue")
                .update({
                  declined_driver_ids: declinedIds,
                  current_driver_id: remainingNotified[0],
                })
                .eq("id", dispatchId);
            }
          }
        }

        toast.info("Course refusée");
      }

      return { success: true };
    } catch (error) {
      console.error("Error responding to dispatch:", error);
      toast.error("Erreur lors de la réponse");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Assigner manuellement un chauffeur
  const manualAssign = useCallback(async (dispatchId: string, driverId: string) => {
    setLoading(true);
    try {
      const { data: dispatch } = await supabase
        .from("fleet_dispatch_queue")
        .select("course_id")
        .eq("id", dispatchId)
        .single();

      if (dispatch?.course_id) {
        await supabase
          .from("courses")
          .update({ driver_id: driverId, status: "pending" })
          .eq("id", dispatch.course_id);
      }

      await supabase
        .from("fleet_dispatch_queue")
        .update({
          status: "assigned",
          assigned_driver_id: driverId,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", dispatchId);

      toast.success("Chauffeur assigné !");
      return { success: true };
    } catch (error) {
      console.error("Error manual assign:", error);
      toast.error("Erreur lors de l'assignation");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Dispatcher une course existante (relance de dispatch)
  // Réinitialise le driver_id à null pour remettre la course dans la file d'attente
  const dispatchExistingCourse = useCallback(async (
    courseId: string,
    fleetManagerId: string
  ) => {
    setLoading(true);
    try {
      // Réinitialiser la course pour la remettre dans la file d'attente
      const { error: updateError } = await supabase
        .from("courses")
        .update({ 
          driver_id: null, 
          status: "pending" 
        })
        .eq("id", courseId)
        .eq("fleet_manager_id", fleetManagerId);

      if (updateError) throw updateError;

      toast.success("Course remise en attente d'assignation");
      return { success: true, mode: "pending" };

    } catch (error) {
      console.error("Error dispatching existing course:", error);
      toast.error("Erreur lors du dispatch");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createDispatch,
    respondToDispatch,
    manualAssign,
    dispatchExistingCourse,
    getDispatchSettings,
    getAvailableDrivers,
  };
};

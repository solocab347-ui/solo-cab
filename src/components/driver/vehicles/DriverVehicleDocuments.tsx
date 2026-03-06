import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { adminNotificationService } from "@/lib/adminNotificationService";
import { generateFreshSignedUrl, extractCleanPath } from "@/lib/storageUtils";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  Trash2,
  Car,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string | null;
  documents_validated: boolean;
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: string;
  document_url: string | null;
  document_name: string | null;
  status: string;
  rejection_reason: string | null;
  uploaded_at: string | null;
}

interface FleetValidation {
  document_type: string;
  document_url: string;
  validated_at: string;
  fleet_manager_id: string;
}

interface DriverVehicleDocumentsProps {
  driverId: string;
  driverName: string;
}

const VEHICLE_DOCUMENT_TYPES = [
  { key: "insurance", label: "Attestation d'assurance", description: "Assurance du véhicule en cours de validité" },
  { key: "registration_card", label: "Carte grise", description: "Carte grise du véhicule" }
];

export const DriverVehicleDocuments = ({ driverId, driverName }: DriverVehicleDocumentsProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documents, setDocuments] = useState<Record<string, VehicleDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fleetValidations, setFleetValidations] = useState<FleetValidation[]>([]);

  useEffect(() => {
    fetchVehiclesAndDocuments();
  }, [driverId]);

  const fetchVehiclesAndDocuments = async () => {
    try {
      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("driver_vehicles")
        .select("id, brand, model, plate, documents_validated")
        .eq("driver_id", driverId)
        .eq("is_active", true);

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Fetch documents for all vehicles
      if (vehiclesData && vehiclesData.length > 0) {
        const vehicleIds = vehiclesData.map(v => v.id);
        const { data: docsData, error: docsError } = await supabase
          .from("driver_vehicle_documents")
          .select("*")
          .in("vehicle_id", vehicleIds);

        if (docsError) throw docsError;

        // Group documents by vehicle
        const groupedDocs: Record<string, VehicleDocument[]> = {};
        docsData?.forEach(doc => {
          if (!groupedDocs[doc.vehicle_id]) {
            groupedDocs[doc.vehicle_id] = [];
          }
          groupedDocs[doc.vehicle_id].push(doc);
        });
        setDocuments(groupedDocs);
      }

      // Fetch fleet validations for this driver
      const { data: validationsData } = await supabase
        .from("fleet_driver_document_validations")
        .select("document_type, document_url, validated_at, fleet_manager_id")
        .eq("driver_id", driverId)
        .eq("status", "validated");

      setFleetValidations(validationsData || []);
    } catch (error) {
      console.error("Error fetching vehicles and documents:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const isDocumentValidatedByFleet = (docType: string, docUrl: string | null) => {
    if (!docUrl) return false;
    return fleetValidations.some(v => v.document_type === docType && v.document_url === docUrl);
  };

  const handleFileUpload = async (vehicleId: string, docType: string, file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5 Mo)");
      return;
    }

    setUploading(`${vehicleId}-${docType}`);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${driverId}/vehicles/${vehicleId}/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Generate signed URL instead of public URL
      const { data: signedUrlData } = await supabase.storage
        .from("driver-documents")
        .createSignedUrl(fileName, 3600);

      const documentUrl = signedUrlData?.signedUrl || fileName;

      // Check if document exists
      const existingDoc = documents[vehicleId]?.find(d => d.document_type === docType);

      if (existingDoc) {
        await supabase
          .from("driver_vehicle_documents")
          .update({
            document_url: documentUrl,
            document_name: file.name,
            status: "submitted",
            uploaded_at: new Date().toISOString(),
            rejection_reason: null
          })
          .eq("id", existingDoc.id);
      } else {
        await supabase
          .from("driver_vehicle_documents")
          .insert({
            vehicle_id: vehicleId,
            driver_id: driverId,
            document_type: docType,
            document_url: documentUrl,
            document_name: file.name,
            status: "submitted",
            uploaded_at: new Date().toISOString()
          });
      }

      // Get vehicle info for notification
      const vehicle = vehicles.find(v => v.id === vehicleId);
      const docLabel = VEHICLE_DOCUMENT_TYPES.find(d => d.key === docType)?.label || docType;
      
      await adminNotificationService.notifyDriverVehicleDocumentUploaded(
        driverName,
        `${vehicle?.brand} ${vehicle?.model}`,
        docLabel
      );

      toast.success("Document téléchargé avec succès");
      fetchVehiclesAndDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDocument = async (vehicleId: string, docType: string) => {
    try {
      const doc = documents[vehicleId]?.find(d => d.document_type === docType);
      if (!doc) return;

      // Check if validated by fleet - cannot delete if validated
      if (doc.document_url && isDocumentValidatedByFleet(docType, doc.document_url)) {
        toast.error("Ce document a été validé par le gestionnaire et ne peut plus être supprimé.");
        return;
      }

      await supabase
        .from("driver_vehicle_documents")
        .update({
          document_url: null,
          document_name: null,
          status: "pending",
          uploaded_at: null
        })
        .eq("id", doc.id);

      toast.success("Document supprimé");
      fetchVehiclesAndDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Alert>
        <Car className="w-4 h-4" />
        <AlertDescription>
          Aucun véhicule enregistré. Ajoutez d'abord un véhicule pour pouvoir télécharger les documents associés.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {vehicles.map(vehicle => {
        const vehicleDocs = documents[vehicle.id] || [];
        const allDocsSubmitted = VEHICLE_DOCUMENT_TYPES.every(
          dt => vehicleDocs.find(d => d.document_type === dt.key && d.document_url)
        );
        const allDocsValidatedByFleet = VEHICLE_DOCUMENT_TYPES.every(dt => {
          const doc = vehicleDocs.find(d => d.document_type === dt.key);
          return doc?.document_url && isDocumentValidatedByFleet(dt.key, doc.document_url);
        });
        const allDocsValidated = VEHICLE_DOCUMENT_TYPES.every(
          dt => vehicleDocs.find(d => d.document_type === dt.key && d.status === "validated")
        ) || allDocsValidatedByFleet;

        return (
          <Card key={vehicle.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {vehicle.brand} {vehicle.model}
                    </CardTitle>
                    <CardDescription>
                      {vehicle.plate || "Plaque non renseignée"}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  className={
                    allDocsValidated 
                      ? "bg-green-500/10 text-green-500" 
                      : allDocsSubmitted 
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-yellow-500/10 text-yellow-500"
                  }
                >
                  {allDocsValidated 
                    ? "Documents validés" 
                    : allDocsSubmitted 
                      ? "En attente de validation"
                      : `${vehicleDocs.filter(d => d.document_url).length}/${VEHICLE_DOCUMENT_TYPES.length} documents`
                  }
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {VEHICLE_DOCUMENT_TYPES.map(docType => {
                const doc = vehicleDocs.find(d => d.document_type === docType.key);
                const hasDoc = doc?.document_url;
                const isValidatedByFleet = hasDoc && isDocumentValidatedByFleet(docType.key, doc.document_url);
                const isValidated = doc?.status === "validated" || isValidatedByFleet;
                const isRejected = doc?.status === "rejected";
                const isUploading = uploading === `${vehicle.id}-${docType.key}`;

                return (
                  <div
                    key={docType.key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg ${
                      isValidated ? 'border-green-500/30 bg-green-500/5' :
                      isRejected ? 'border-red-500/30 bg-red-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isValidated ? (
                        <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : hasDoc ? (
                        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{docType.label}</p>
                        <p className="text-sm text-muted-foreground truncate">{docType.description}</p>
                        {isValidated && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Validé par le gestionnaire
                          </p>
                        )}
                        {doc?.uploaded_at && !isValidated && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Téléchargé le {format(new Date(doc.uploaded_at), "dd/MM/yyyy")}
                          </p>
                        )}
                        {isRejected && doc?.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {doc.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasDoc ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // Extract file path from URL for signed URL generation
                              let filePath = doc.document_url!;
                              if (filePath.includes('/storage/v1/object/')) {
                                const parts = filePath.split('/storage/v1/object/');
                                if (parts[1]) {
                                  filePath = parts[1].replace(/^(public|sign)\//, '');
                                  filePath = filePath.replace(/^[^/]+\//, '');
                                }
                              }
                              const { data } = await supabase.storage
                                .from('driver-documents')
                                .createSignedUrl(filePath, 3600);
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, "_blank");
                              }
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!isValidated && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDocument(vehicle.id, docType.key)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Label htmlFor={`upload-${vehicle.id}-${docType.key}`} className="cursor-pointer">
                          <div className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            <span className="text-sm">Télécharger</span>
                          </div>
                          <Input
                            id={`upload-${vehicle.id}-${docType.key}`}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(vehicle.id, docType.key, file);
                            }}
                            disabled={isUploading}
                          />
                        </Label>
                      )}
                    </div>
                  </div>
                );
              })}

              {allDocsValidated && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Tous les documents de ce véhicule ont été validés par votre gestionnaire de flotte.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

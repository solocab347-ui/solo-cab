import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Loader2, 
  GripVertical,
  Edit,
  Save,
  X
} from "lucide-react";

interface FleetRequiredDocumentsManagerProps {
  fleetManagerId: string;
}

interface RequiredDocument {
  id: string;
  document_key: string;
  label: string;
  description: string | null;
  is_required: boolean;
  display_order: number;
}

export const FleetRequiredDocumentsManager = ({ fleetManagerId }: FleetRequiredDocumentsManagerProps) => {
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState({
    document_key: "",
    label: "",
    description: "",
    is_required: true,
  });

  useEffect(() => {
    fetchDocuments();
  }, [fleetManagerId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_required_documents")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!newDoc.label || !newDoc.document_key) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Vérifier que la clé n'existe pas déjà
    if (documents.some(d => d.document_key === newDoc.document_key)) {
      toast.error("Un document avec cette clé existe déjà");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("fleet_required_documents")
        .insert({
          fleet_manager_id: fleetManagerId,
          document_key: newDoc.document_key.toLowerCase().replace(/\s+/g, "_"),
          label: newDoc.label,
          description: newDoc.description || null,
          is_required: newDoc.is_required,
          display_order: documents.length,
        });

      if (error) throw error;

      toast.success("Document ajouté avec succès");
      setShowAddDialog(false);
      setNewDoc({ document_key: "", label: "", description: "", is_required: true });
      fetchDocuments();
    } catch (error) {
      console.error("Error adding document:", error);
      toast.error("Erreur lors de l'ajout du document");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRequired = async (doc: RequiredDocument) => {
    try {
      const { error } = await supabase
        .from("fleet_required_documents")
        .update({ is_required: !doc.is_required })
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments(docs => 
        docs.map(d => d.id === doc.id ? { ...d, is_required: !d.is_required } : d)
      );
      toast.success("Mise à jour effectuée");
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document requis ?")) return;

    try {
      const { error } = await supabase
        .from("fleet_required_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      setDocuments(docs => docs.filter(d => d.id !== docId));
      toast.success("Document supprimé");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleUpdateDocument = async (doc: RequiredDocument) => {
    try {
      const { error } = await supabase
        .from("fleet_required_documents")
        .update({
          label: doc.label,
          description: doc.description,
        })
        .eq("id", doc.id);

      if (error) throw error;

      setEditingId(null);
      toast.success("Document mis à jour");
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents requis pour les chauffeurs
            </CardTitle>
            <CardDescription>
              Définissez les documents que vos chauffeurs doivent fournir
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun document requis configuré
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  {editingId === doc.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={doc.label}
                        onChange={(e) => setDocuments(docs => 
                          docs.map(d => d.id === doc.id ? { ...d, label: e.target.value } : d)
                        )}
                        placeholder="Libellé"
                      />
                      <Input
                        value={doc.description || ""}
                        onChange={(e) => setDocuments(docs => 
                          docs.map(d => d.id === doc.id ? { ...d, description: e.target.value } : d)
                        )}
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.label}</p>
                        {doc.is_required ? (
                          <Badge variant="secondary" className="text-xs">Obligatoire</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Optionnel</Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Clé: {doc.document_key}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={doc.is_required}
                    onCheckedChange={() => handleToggleRequired(doc)}
                  />
                  
                  {editingId === doc.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateDocument(doc)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          fetchDocuments();
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(doc.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Document Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un document requis</DialogTitle>
              <DialogDescription>
                Ce document sera demandé à tous vos chauffeurs lors de leur inscription
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="doc-label">Libellé *</Label>
                <Input
                  id="doc-label"
                  value={newDoc.label}
                  onChange={(e) => setNewDoc({ ...newDoc, label: e.target.value })}
                  placeholder="Ex: Attestation de formation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-key">Clé unique *</Label>
                <Input
                  id="doc-key"
                  value={newDoc.document_key}
                  onChange={(e) => setNewDoc({ ...newDoc, document_key: e.target.value })}
                  placeholder="Ex: formation_attestation"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez des lettres minuscules et underscores uniquement
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-description">Description</Label>
                <Input
                  id="doc-description"
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  placeholder="Ex: Attestation de formation VTC en cours de validité"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="doc-required">Document obligatoire</Label>
                <Switch
                  id="doc-required"
                  checked={newDoc.is_required}
                  onCheckedChange={(checked) => setNewDoc({ ...newDoc, is_required: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddDocument} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

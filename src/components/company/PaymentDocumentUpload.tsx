import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, Loader2, X, Eye, Download } from "lucide-react";

interface PaymentDocumentUploadProps {
  paymentId: string;
  onSuccess?: () => void;
}

interface PaymentDocument {
  id: string;
  document_url: string;
  document_type: string;
  file_name: string;
  uploaded_at: string;
}

export function PaymentDocumentUpload({ paymentId, onSuccess }: PaymentDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadDocument = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${paymentId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('company_payment_documents')
        .insert({
          payment_id: paymentId,
          document_url: urlData.publicUrl,
          document_type: 'proof_of_payment',
          file_name: file.name,
        });

      if (dbError) throw dbError;

      toast.success("Justificatif ajouté");
      queryClient.invalidateQueries({ queryKey: ["payment-documents", paymentId] });
      onSuccess?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 10MB)");
        return;
      }
      uploadDocument(file);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        id={`file-upload-${paymentId}`}
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Label
        htmlFor={`file-upload-${paymentId}`}
        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer hover:bg-muted transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? "Envoi..." : "Justificatif"}
      </Label>
    </div>
  );
}

interface PaymentDocumentsListProps {
  paymentId: string;
  documents: PaymentDocument[];
  canDelete?: boolean;
  onRefresh?: () => void;
}

export function PaymentDocumentsList({ paymentId, documents, canDelete = false, onRefresh }: PaymentDocumentsListProps) {
  const queryClient = useQueryClient();

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('company_payment_documents')
        .delete()
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document supprimé");
      queryClient.invalidateQueries({ queryKey: ["payment-documents", paymentId] });
      onRefresh?.();
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  if (documents.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {documents.map((doc) => (
        <Badge key={doc.id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
          <FileText className="w-3 h-3" />
          <a
            href={doc.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline max-w-[100px] truncate"
          >
            {doc.file_name}
          </a>
          {canDelete && (
            <button
              onClick={() => deleteDocument.mutate(doc.id)}
              className="ml-1 text-destructive hover:text-destructive/80"
              disabled={deleteDocument.isPending}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}

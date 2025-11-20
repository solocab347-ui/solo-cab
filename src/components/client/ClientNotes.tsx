import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const ClientNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;

    try {
      // Notes would be stored in a notes table - placeholder for now
      // For now, using localStorage as temporary storage
      const savedNotes = localStorage.getItem(`notes_${user.id}`);
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const saveNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast.error("Veuillez remplir le titre et le contenu");
      return;
    }

    const note: Note = {
      id: editingId || Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      created_at: new Date().toISOString(),
    };

    let updatedNotes;
    if (editingId) {
      updatedNotes = notes.map((n) => (n.id === editingId ? note : n));
      toast.success("Note mise à jour");
    } else {
      updatedNotes = [note, ...notes];
      toast.success("Note créée");
    }

    setNotes(updatedNotes);
    localStorage.setItem(`notes_${user?.id}`, JSON.stringify(updatedNotes));
    setNewNote({ title: "", content: "" });
    setEditingId(null);
  };

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${user?.id}`, JSON.stringify(updatedNotes));
    toast.success("Note supprimée");
  };

  const editNote = (note: Note) => {
    setNewNote({ title: note.title, content: note.content });
    setEditingId(note.id);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? "Modifier la note" : "Nouvelle note"}
        </h3>
        <div className="space-y-4">
          <Input
            placeholder="Titre de la note"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
          />
          <Textarea
            placeholder="Contenu de la note..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={4}
          />
          <div className="flex gap-2">
            <Button onClick={saveNote}>
              <Plus className="w-4 h-4 mr-2" />
              {editingId ? "Mettre à jour" : "Ajouter"}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setNewNote({ title: "", content: "" });
                }}
              >
                Annuler
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Aucune note pour le moment</p>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">{note.title}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editNote(note)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {note.content}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {new Date(note.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientNotes;

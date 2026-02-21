import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Plus, 
  Pencil, 
  Trash2, 
  Video, 
  Eye,
  Loader2,
  GripVertical,
  Upload,
  FileVideo
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TrainingVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  duration_seconds: number | null;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'welcome', label: 'Bienvenue', color: 'bg-emerald-500' },
  { value: 'features', label: 'Fonctionnalités', color: 'bg-blue-500' },
  { value: 'tips', label: 'Conseils', color: 'bg-amber-500' },
  { value: 'tutorial', label: 'Tutoriel', color: 'bg-purple-500' },
];

export default function AdminVideosManagement() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    category: 'features',
    duration_seconds: '',
    is_mandatory: false,
    is_active: true,
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Erreur lors du chargement des vidéos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez MP4, WebM, OGG ou MOV.');
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 500 Mo)');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('training-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('training-videos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, video_url: urlData.publicUrl }));
      setUploadProgress(100);
      toast.success('Vidéo téléchargée avec succès !');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Erreur d'upload: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.video_url) {
      toast.error('Titre et vidéo requis');
      return;
    }

    setSaving(true);
    try {
      const videoData = {
        title: formData.title,
        description: formData.description || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        category: formData.category,
        duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('training_videos')
          .update(videoData)
          .eq('id', editingVideo.id);
        
        if (error) throw error;
        toast.success('Vidéo mise à jour');
      } else {
        const { error } = await supabase
          .from('training_videos')
          .insert({
            ...videoData,
            display_order: videos.length,
          });
        
        if (error) throw error;
        toast.success('Vidéo ajoutée');
      }

      setDialogOpen(false);
      resetForm();
      fetchVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette vidéo ?')) return;

    try {
      // Find the video to get its URL for storage cleanup
      const video = videos.find(v => v.id === id);
      
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Try to delete from storage if it's a storage URL
      if (video?.video_url?.includes('training-videos')) {
        try {
          const path = video.video_url.split('training-videos/')[1];
          if (path) {
            await supabase.storage.from('training-videos').remove([path]);
          }
        } catch (e) {
          console.warn('Could not delete storage file:', e);
        }
      }

      toast.success('Vidéo supprimée');
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (video: TrainingVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      category: video.category,
      duration_seconds: video.duration_seconds?.toString() || '',
      is_mandatory: video.is_mandatory,
      is_active: video.is_active,
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (video: TrainingVideo) => {
    try {
      const { error } = await supabase
        .from('training_videos')
        .update({ is_active: !video.is_active })
        .eq('id', video.id);

      if (error) throw error;
      fetchVideos();
    } catch (error) {
      console.error('Error toggling video:', error);
      toast.error('Erreur');
    }
  };

  const resetForm = () => {
    setEditingVideo(null);
    setFormData({
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      category: 'features',
      duration_seconds: '',
      is_mandatory: false,
      is_active: true,
    });
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return (
      <Badge variant="secondary" className={`${cat?.color || 'bg-gray-500'} text-white`}>
        {cat?.label || category}
      </Badge>
    );
  };

  const isStorageVideo = (url: string) => url?.includes('training-videos');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Gestion des Vidéos
          </h2>
          <p className="text-muted-foreground">
            Gérez les vidéos de formation et de bienvenue pour les chauffeurs
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une vidéo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVideo ? 'Modifier la vidéo' : 'Nouvelle vidéo'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre de la vidéo"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la vidéo"
                  rows={3}
                />
              </div>

              {/* Video Upload Section */}
              <div className="space-y-3">
                <Label>Vidéo *</Label>
                
                {/* File Upload */}
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">Cliquez pour télécharger une vidéo</p>
                      <p className="text-xs text-muted-foreground">MP4, WebM, OGG, MOV • Max 500 Mo</p>
                    </div>
                  )}
                </div>

                {/* Current video URL display */}
                {formData.video_url && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileVideo className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">
                      {isStorageVideo(formData.video_url) 
                        ? `✅ Vidéo uploadée` 
                        : formData.video_url}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(formData.video_url, '_blank')}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Optional: Manual URL fallback */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ou coller une URL externe
                  </summary>
                  <Input
                    value={isStorageVideo(formData.video_url) ? '' : formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://youtube.com/embed/... ou URL directe"
                    className="mt-2"
                  />
                </details>
              </div>

              <div className="space-y-2">
                <Label>URL miniature (optionnel)</Label>
                <Input
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Durée (secondes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_seconds}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_seconds: e.target.value }))}
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_mandatory: checked }))}
                  />
                  <Label>Visionnage obligatoire</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={saving || uploading}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingVideo ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{videos.length}</p>
                <p className="text-sm text-muted-foreground">Vidéos totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{videos.filter(v => v.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Play className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{videos.filter(v => v.is_mandatory).length}</p>
                <p className="text-sm text-muted-foreground">Obligatoires</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {videos.filter(v => isStorageVideo(v.video_url)).length}
                </p>
                <p className="text-sm text-muted-foreground">Uploadées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des vidéos</CardTitle>
          <CardDescription>
            Uploadez vos vidéos directement ou utilisez des liens externes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune vidéo configurée</p>
              <p className="text-sm">Ajoutez votre première vidéo de formation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Obligatoire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{video.title}</p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isStorageVideo(video.video_url) ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                          <Upload className="w-3 h-3 mr-1" />
                          Uploadée
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                          Lien externe
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getCategoryBadge(video.category)}</TableCell>
                    <TableCell>
                      {video.duration_seconds 
                        ? `${Math.floor(video.duration_seconds / 60)}:${(video.duration_seconds % 60).toString().padStart(2, '0')}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {video.is_mandatory ? (
                        <Badge variant="destructive">Obligatoire</Badge>
                      ) : (
                        <Badge variant="secondary">Optionnel</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={video.is_active}
                        onCheckedChange={() => handleToggleActive(video)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(video.video_url, '_blank')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(video)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(video.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

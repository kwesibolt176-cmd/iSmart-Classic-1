import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Trash2, Edit, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const StaffAnnouncementsManager = () => {
  const { user } = useBusiness();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    is_active: true,
    expires_at: "",
  });

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("staff_announcements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching announcements:", error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const title = formData.title.trim();
    const content = formData.content.trim();
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }
    if (formData.expires_at && new Date(formData.expires_at) <= new Date()) {
      toast.error("Expiry must be in the future");
      return;
    }

    const announcementData = {
      user_id: user.id,
      title,
      content,
      priority: formData.priority,
      is_active: formData.is_active,
      expires_at: formData.expires_at || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("staff_announcements")
        .update(announcementData)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update announcement");
      } else {
        toast.success("Announcement updated");
        fetchAnnouncements();
      }
    } else {
      const { error } = await supabase
        .from("staff_announcements")
        .insert(announcementData);

      if (error) {
        toast.error("Failed to create announcement");
      } else {
        toast.success("Announcement created");
        fetchAnnouncements();
      }
    }

    resetForm();
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("staff_announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete announcement");
    } else {
      toast.success("Announcement deleted");
      fetchAnnouncements();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("staff_announcements")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      fetchAnnouncements();
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", priority: "normal", is_active: true, expires_at: "" });
    setEditingId(null);
    setDialogOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "low": return "secondary";
      default: return "default";
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading announcements...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Staff Announcements
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "New"} Announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expires At (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No announcements yet</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border ${announcement.is_active ? "bg-card" : "bg-muted/50 opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{announcement.title}</h4>
                      <Badge variant={getPriorityColor(announcement.priority)}>
                        {announcement.priority}
                      </Badge>
                      {!announcement.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{format(new Date(announcement.created_at), "MMM d, yyyy HH:mm")}</span>
                      {announcement.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires: {format(new Date(announcement.expires_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={announcement.is_active}
                      onCheckedChange={() => toggleActive(announcement.id, announcement.is_active)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(announcement)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

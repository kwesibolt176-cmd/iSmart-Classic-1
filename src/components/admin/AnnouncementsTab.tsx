import { useEffect, useState } from "react";
import { Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  target_tiers: string[];
  is_active: boolean;
  priority: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

const AVAILABLE_TIERS = ["free", "basic", "professional", "enterprise"];

export const AnnouncementsTab = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    announcement_type: "info",
    target_tiers: [] as string[],
    starts_at: new Date().toISOString().split("T")[0],
    ends_at: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const { error } = await supabase.from("platform_announcements").insert([{
        ...newAnnouncement,
        ends_at: newAnnouncement.ends_at || null,
        created_by: currentUser?.user?.id,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement created successfully",
      });

      setIsDialogOpen(false);
      setNewAnnouncement({
        title: "",
        content: "",
        announcement_type: "info",
        target_tiers: [],
        starts_at: new Date().toISOString().split("T")[0],
        ends_at: "",
      });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("platform_announcements")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Announcement ${!isActive ? "activated" : "deactivated"}`,
      });

      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("platform_announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement deleted",
      });

      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "info": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "warning": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "maintenance": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "feature": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "promotion": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Platform Announcements
            </CardTitle>
            <CardDescription>
              Broadcast important messages to businesses by subscription tier
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Announcement title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Announcement message..."
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newAnnouncement.announcement_type}
                    onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, announcement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="feature">New Feature</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Tiers</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {AVAILABLE_TIERS.map((tier) => (
                      <div key={tier} className="flex items-center space-x-2">
                        <Checkbox
                          id={`announce-${tier}`}
                          checked={newAnnouncement.target_tiers.includes(tier)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewAnnouncement({
                                ...newAnnouncement,
                                target_tiers: [...newAnnouncement.target_tiers, tier],
                              });
                            } else {
                              setNewAnnouncement({
                                ...newAnnouncement,
                                target_tiers: newAnnouncement.target_tiers.filter((t) => t !== tier),
                              });
                            }
                          }}
                        />
                        <label htmlFor={`announce-${tier}`} className="text-sm capitalize cursor-pointer">
                          {tier}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Starts At</Label>
                    <Input
                      type="date"
                      value={newAnnouncement.starts_at}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, starts_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ends At (Optional)</Label>
                    <Input
                      type="date"
                      value={newAnnouncement.ends_at}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, ends_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} className="gap-2">
                    <Save className="w-4 h-4" />
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No announcements created</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className={getTypeColor(announcement.announcement_type)}>
                        {announcement.announcement_type.toUpperCase()}
                      </Badge>
                      <h4 className="font-semibold">{announcement.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{announcement.content}</p>
                    <div className="flex gap-2 flex-wrap items-center text-xs text-muted-foreground">
                      <span>
                        {format(new Date(announcement.starts_at), "MMM d, yyyy")} -{" "}
                        {announcement.ends_at
                          ? format(new Date(announcement.ends_at), "MMM d, yyyy")
                          : "No end date"}
                      </span>
                      {announcement.target_tiers.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-1">
                            {announcement.target_tiers.map((tier) => (
                              <Badge key={tier} variant="secondary" className="capitalize text-xs">
                                {tier}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={announcement.is_active}
                      onCheckedChange={() => handleToggle(announcement.id, announcement.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Settings, Trash2, QrCode, MapPin } from "lucide-react";
import { StationManager } from "./StationManager";

interface StationGroup {
  id: string;
  name: string;
  description: string | null;
  location_id: string | null;
  is_active: boolean;
  auto_assign_station: boolean;
  created_at: string;
}

export const StationGroupManager = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StationGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    auto_assign_station: false,
  });
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["ordering-station-groups"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ordering_station_groups")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StationGroup[];
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: typeof newGroup) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ordering_station_groups")
        .insert({
          user_id: user.id,
          name: groupData.name,
          description: groupData.description || null,
          auto_assign_station: groupData.auto_assign_station,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordering-station-groups"] });
      setIsCreateOpen(false);
      setNewGroup({ name: "", description: "", auto_assign_station: false });
      toast.success("Station group created");
    },
    onError: (error) => {
      toast.error("Failed to create station group");
      console.error(error);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("ordering_station_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordering-station-groups"] });
      toast.success("Station group deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete station group");
      console.error(error);
    },
  });

  const toggleGroupMutation = useMutation({
    mutationFn: async ({ groupId, isActive }: { groupId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ordering_station_groups")
        .update({ is_active: isActive })
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordering-station-groups"] });
      toast.success("Station group updated");
    },
  });

  if (selectedGroup) {
    return (
      <StationManager 
        group={selectedGroup} 
        onBack={() => setSelectedGroup(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Self-Serve Ordering</h2>
          <p className="text-muted-foreground">
            Manage QR code stations for self-service ordering
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Station Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Station Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  placeholder="e.g., Main Dining Area"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="e.g., Tables 1-20"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-assign Station</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically assign customers to available stations
                  </p>
                </div>
                <Switch
                  checked={newGroup.auto_assign_station}
                  onCheckedChange={(checked) => 
                    setNewGroup({ ...newGroup, auto_assign_station: checked })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createGroupMutation.mutate(newGroup)}
                disabled={!newGroup.name || createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50" />
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
      ) : groups?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Station Groups</h3>
            <p className="text-muted-foreground mb-4">
              Create your first station group to start using QR code ordering
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Station Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  )}
                </div>
                <Badge variant={group.is_active ? "default" : "secondary"}>
                  {group.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {group.auto_assign_station 
                      ? "Auto-assign enabled" 
                      : "Manual station entry"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Stations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleGroupMutation.mutate({ 
                      groupId: group.id, 
                      isActive: !group.is_active 
                    })}
                  >
                    {group.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this station group and all its stations?")) {
                        deleteGroupMutation.mutate(group.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

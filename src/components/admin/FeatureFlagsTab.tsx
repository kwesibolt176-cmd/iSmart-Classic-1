import { useEffect, useState } from "react";
import { Flag, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  enabled_for_tiers: string[];
  is_active: boolean;
  created_at: string;
}

const AVAILABLE_TIERS = ["free", "basic", "professional", "enterprise"];

export const FeatureFlagsTab = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({
    feature_key: "",
    feature_name: "",
    description: "",
    enabled_for_tiers: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlags(data || []);
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
    if (!newFlag.feature_key || !newFlag.feature_name) {
      toast({
        title: "Error",
        description: "Feature key and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("feature_flags").insert([newFlag]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feature flag created successfully",
      });

      setIsDialogOpen(false);
      setNewFlag({
        feature_key: "",
        feature_name: "",
        description: "",
        enabled_for_tiers: [],
      });
      fetchFlags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (flagId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ is_active: !isActive })
        .eq("id", flagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Feature flag ${!isActive ? "enabled" : "disabled"}`,
      });

      fetchFlags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (flagId: string) => {
    try {
      const { error } = await supabase
        .from("feature_flags")
        .delete()
        .eq("id", flagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feature flag deleted",
      });

      fetchFlags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
              <Flag className="w-5 h-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Control feature availability by subscription tier
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Feature Flag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Feature Flag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Feature Key</Label>
                  <Input
                    placeholder="e.g., advanced_analytics"
                    value={newFlag.feature_key}
                    onChange={(e) => setNewFlag({ ...newFlag, feature_key: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Feature Name</Label>
                  <Input
                    placeholder="e.g., Advanced Analytics"
                    value={newFlag.feature_name}
                    onChange={(e) => setNewFlag({ ...newFlag, feature_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Feature description..."
                    value={newFlag.description}
                    onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enabled For Tiers</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {AVAILABLE_TIERS.map((tier) => (
                      <div key={tier} className="flex items-center space-x-2">
                        <Checkbox
                          id={tier}
                          checked={newFlag.enabled_for_tiers.includes(tier)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewFlag({
                                ...newFlag,
                                enabled_for_tiers: [...newFlag.enabled_for_tiers, tier],
                              });
                            } else {
                              setNewFlag({
                                ...newFlag,
                                enabled_for_tiers: newFlag.enabled_for_tiers.filter((t) => t !== tier),
                              });
                            }
                          }}
                        />
                        <label htmlFor={tier} className="text-sm capitalize cursor-pointer">
                          {tier}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} className="gap-2">
                    <Save className="w-4 h-4" />
                    Create Flag
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No feature flags configured</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{flag.feature_name}</h4>
                      <Badge variant="outline" className="font-mono text-xs">
                        {flag.feature_key}
                      </Badge>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground mb-2">{flag.description}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {flag.enabled_for_tiers.map((tier) => (
                        <Badge key={tier} variant="secondary" className="capitalize">
                          {tier}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={flag.is_active}
                      onCheckedChange={() => handleToggle(flag.id, flag.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(flag.id)}
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

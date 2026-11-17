import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ProfileSettings = () => {
  const { user } = useBusiness();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setFirstName(user.user_metadata?.first_name || "");
      setLastName(user.user_metadata?.last_name || "");
      setPhone(user.user_metadata?.phone || "");
      setAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const getInitials = () => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = new Set(["image/jpeg", "image/png"]);
    if (!allowedTypes.has(file.type)) {
      toast({ title: "Invalid image", description: "Profile photos must be JPG or PNG files.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Profile photos must be smaller than 2 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.type === "image/png" ? "png" : "jpg";
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("business-assets")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: "Success", description: "Profile picture updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        avatar_url: avatarUrl,
      }
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated successfully" });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Profile Information</CardTitle>
        <CardDescription>Update your personal details and profile picture</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Change Photo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Max 2MB, JPG/PNG</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={email}
            disabled
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 XX XXX XXXX"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" defaultValue="Manager" disabled />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => {
            if (user) {
              setFirstName(user.user_metadata?.first_name || "");
              setLastName(user.user_metadata?.last_name || "");
              setPhone(user.user_metadata?.phone || "");
            }
          }}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

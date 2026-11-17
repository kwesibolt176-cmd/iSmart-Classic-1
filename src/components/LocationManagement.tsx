import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, MapPin, Phone, Mail, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation } from "@/contexts/LocationContext";
import { toast } from "sonner";

interface LocationForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  is_default: boolean;
}

export const LocationManagement = () => {
  const { user } = useBusiness();
  const { locations, refreshLocations } = useLocation();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>({
    name: "",
    address: "",
    phone: "",
    email: "",
    is_default: false,
  });

  const resetForm = () => {
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      is_default: false,
    });
    setEditingId(null);
  };

  const handleEdit = (location: any) => {
    setForm({
      name: location.name,
      address: location.address || "",
      phone: location.phone || "",
      email: location.email || "",
      is_default: location.is_default,
    });
    setEditingId(location.id);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from("locations")
          .update({
            name: form.name,
            address: form.address || null,
            phone: form.phone || null,
            email: form.email || null,
            is_default: form.is_default,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Location updated successfully");
      } else {
        const { error } = await supabase.from("locations").insert({
          user_id: user.id,
          name: form.name,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          is_default: form.is_default,
        });

        if (error) throw error;
        toast.success("Location created successfully");
      }

      await refreshLocations();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const { error } = await supabase
        .from("locations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Location deleted successfully");
      await refreshLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Locations</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your store locations</p>
        </div>
        <Dialog open={open} onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Location</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Location" : "Add New Location"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Main Store"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  id="phone"
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="store@example.com"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={form.is_default}
                  onCheckedChange={(checked) => setForm({ ...form, is_default: checked })}
                />
                <Label htmlFor="is_default">Set as default location</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Card key={location.id} className="relative">
            {location.is_default && (
              <div className="absolute top-3 right-3">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {location.name}
              </CardTitle>
              <CardDescription>
                {location.is_default ? "Default Location" : "Location"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {location.address && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  {location.address}
                </p>
              )}
              {location.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  {location.phone}
                </p>
              )}
              {location.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  {location.email}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(location)}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {!location.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {locations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first location to start managing multiple stores
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ArrowLeft, QrCode, Trash2, Download, Eye } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

interface Station {
  id: string;
  station_name: string;
  station_number: number;
  qr_code_token: string;
  is_active: boolean;
}

interface StationGroup {
  id: string;
  name: string;
  description: string | null;
  auto_assign_station: boolean;
}

interface StationManagerProps {
  group: StationGroup;
  onBack: () => void;
}

export const StationManager = ({ group, onBack }: StationManagerProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQRPreviewOpen, setIsQRPreviewOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [bulkCount, setBulkCount] = useState(1);
  const [stationPrefix, setStationPrefix] = useState("Table");
  const [startNumber, setStartNumber] = useState(1);
  const queryClient = useQueryClient();

  const { data: stations, isLoading } = useQuery({
    queryKey: ["ordering-stations", group.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordering_stations")
        .select("*")
        .eq("group_id", group.id)
        .order("station_number", { ascending: true });

      if (error) throw error;
      return data as Station[];
    },
  });

  const createStationsMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const stationsToCreate = Array.from({ length: bulkCount }, (_, i) => ({
        user_id: user.id,
        group_id: group.id,
        station_name: `${stationPrefix} ${startNumber + i}`,
        station_number: startNumber + i,
      }));

      const { data, error } = await supabase
        .from("ordering_stations")
        .insert(stationsToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordering-stations", group.id] });
      setIsCreateOpen(false);
      setBulkCount(1);
      toast.success(`${bulkCount} station(s) created`);
    },
    onError: (error) => {
      toast.error("Failed to create stations");
      console.error(error);
    },
  });

  const deleteStationMutation = useMutation({
    mutationFn: async (stationId: string) => {
      const { error } = await supabase
        .from("ordering_stations")
        .delete()
        .eq("id", stationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordering-stations", group.id] });
      toast.success("Station deleted");
    },
  });

  const toggleStationMutation = useMutation({
    mutationFn: async ({ stationId, isActive }: { stationId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ordering_stations")
        .update({ is_active: isActive })
        .eq("id", stationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordering-stations", group.id] });
    },
  });

  const getQRCodeUrl = (token: string) => {
    return `${window.location.origin}/order/${token}`;
  };

  const downloadQRCode = (station: Station) => {
    const canvas = document.getElementById(`qr-${station.id}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${station.station_name}-qr.png`;
      link.href = url;
      link.click();
    }
  };

  const downloadAllQRCodes = async () => {
    if (!stations?.length) return;
    
    for (const station of stations) {
      await new Promise(resolve => setTimeout(resolve, 100));
      downloadQRCode(station);
    }
    toast.success("All QR codes downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{group.name}</h2>
          <p className="text-muted-foreground">{group.description || "Manage stations and QR codes"}</p>
        </div>
        <div className="flex gap-2">
          {stations && stations.length > 0 && (
            <Button variant="outline" onClick={downloadAllQRCodes}>
              <Download className="w-4 h-4 mr-2" />
              Download All QR Codes
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Stations
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Ordering Stations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Station Name Prefix</Label>
                  <Input
                    placeholder="e.g., Table, Counter, Booth"
                    value={stationPrefix}
                    onChange={(e) => setStationPrefix(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Starting Number</Label>
                    <Input
                      type="number"
                      min={1}
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Stations</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Math.min(50, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    This will create: {Array.from({ length: Math.min(3, bulkCount) }, (_, i) => 
                      `${stationPrefix} ${startNumber + i}`
                    ).join(", ")}{bulkCount > 3 ? `, ... (${bulkCount} total)` : ""}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createStationsMutation.mutate()}
                  disabled={!stationPrefix || createStationsMutation.isPending}
                >
                  {createStationsMutation.isPending ? "Creating..." : `Create ${bulkCount} Station(s)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : stations?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stations</h3>
            <p className="text-muted-foreground mb-4">
              Add stations to generate QR codes for self-service ordering
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Stations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stations?.map((station) => (
            <Card key={station.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{station.station_name}</CardTitle>
                  <Badge variant={station.is_active ? "default" : "secondary"} className="text-xs">
                    {station.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center bg-white p-3 rounded-lg">
                  <QRCodeCanvas
                    id={`qr-${station.id}`}
                    value={getQRCodeUrl(station.qr_code_token)}
                    size={120}
                    level="M"
                    includeMargin
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedStation(station);
                      setIsQRPreviewOpen(true);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadQRCode(station)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleStationMutation.mutate({
                      stationId: station.id,
                      isActive: !station.is_active,
                    })}
                  >
                    {station.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete ${station.station_name}?`)) {
                        deleteStationMutation.mutate(station.id);
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

      {/* QR Preview Dialog */}
      <Dialog open={isQRPreviewOpen} onOpenChange={setIsQRPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedStation?.station_name} - QR Code</DialogTitle>
          </DialogHeader>
          {selectedStation && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <QRCodeCanvas
                  value={getQRCodeUrl(selectedStation.qr_code_token)}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{selectedStation.station_name}</p>
                <p className="text-sm text-muted-foreground">Scan to order</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(getQRCodeUrl(selectedStation.qr_code_token));
                    toast.success("Link copied to clipboard");
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => downloadQRCode(selectedStation)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

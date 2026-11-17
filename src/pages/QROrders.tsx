import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelfServeOrdersManager } from "@/components/qr-ordering/SelfServeOrdersManager";
import { StationGroupManager } from "@/components/qr-ordering/StationGroupManager";
import { ClipboardList, QrCode } from "lucide-react";

export default function QROrders() {
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">QR Code Ordering</h1>
        <p className="text-muted-foreground">
          Manage self-serve orders and QR code stations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="stations" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Stations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <SelfServeOrdersManager />
        </TabsContent>

        <TabsContent value="stations" className="mt-6">
          <StationGroupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

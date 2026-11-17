import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WaitlistEntry {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  waitTime: string;
  status: "waiting" | "notified" | "seated";
}

export const WaitlistManager = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ name: "", phone: "", partySize: 2 });

  const handleAddToWaitlist = () => {
    if (!newEntry.name) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    const entry: WaitlistEntry = {
      id: Date.now().toString(),
      name: newEntry.name,
      phone: newEntry.phone,
      partySize: newEntry.partySize,
      waitTime: "Just added",
      status: "waiting",
    };

    setEntries([...entries, entry]);
    setNewEntry({ name: "", phone: "", partySize: 2 });
    toast({
      title: "Added to waitlist",
      description: `${newEntry.name} has been added`,
    });
  };

  const handleNotify = (id: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, status: "notified" as const } : e));
    toast({
      title: "Customer notified",
      description: "SMS sent to customer's phone",
    });
  };

  const handleSeat = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    toast({
      title: "Customer seated",
      description: "Table assigned successfully",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Waitlist ({entries.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="waitlistName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input 
              id="waitlistName" 
              placeholder="Enter customer name" 
              className="h-10 bg-muted/20"
              value={newEntry.name}
              onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="waitlistPhone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input 
                id="waitlistPhone" 
                placeholder="024..." 
                className="h-10 bg-muted/20"
                value={newEntry.phone}
                onChange={(e) => setNewEntry({ ...newEntry, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlistParty" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Guests</Label>
              <Input 
                id="waitlistParty" 
                type="number" 
                placeholder="2" 
                className="h-10 bg-muted/20"
                value={newEntry.partySize}
                onChange={(e) => setNewEntry({ ...newEntry, partySize: parseInt(e.target.value) || 2 })}
              />
            </div>
          </div>
          <Button className="w-full h-10 font-bold shadow-md" onClick={handleAddToWaitlist}>
            Add to Waitlist
          </Button>
        </div>

        <div className="space-y-3 pt-6 border-t border-border">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Waiting List</p>
          {entries.length === 0 ? (
            <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No one waiting</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-foreground text-sm truncate">{entry.name}</p>
                      <Badge variant={entry.status === "waiting" ? "secondary" : "default"} className="text-[10px] h-4 uppercase font-black">
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground font-medium">
                      {entry.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-primary/60" />
                          <span className="truncate">{entry.phone}</span>
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-primary/60" />
                          {entry.partySize} guests
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-500">
                          <Clock className="w-3 h-3" />
                          {entry.waitTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNotify(entry.id)}
                    className="flex-1 text-[11px] font-bold h-8"
                    disabled={entry.status === "notified"}
                  >
                    Notify
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleSeat(entry.id)} 
                    className="flex-1 text-[11px] font-bold h-8"
                  >
                    Seat Now
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

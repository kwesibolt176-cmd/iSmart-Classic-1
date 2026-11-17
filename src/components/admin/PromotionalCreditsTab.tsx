import { useEffect, useState } from "react";
import { Gift, Plus, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PromoCredit {
  id: string;
  user_id: string;
  credit_amount: number;
  credit_type: string;
  reason: string | null;
  expires_at: string | null;
  used_amount: number;
  status: string;
  created_at: string;
}

export const PromotionalCreditsTab = () => {
  const [credits, setCredits] = useState<PromoCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCredit, setNewCredit] = useState({
    user_email: "",
    credit_amount: "",
    credit_type: "general",
    reason: "",
    expires_at: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_credits")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredits(data || []);
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

  const handleGrantCredit = async () => {
    if (!newCredit.user_email || !newCredit.credit_amount) {
      toast({
        title: "Error",
        description: "User email and credit amount are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find user by email
      const { data, error: searchError } = await supabase.auth.admin.listUsers();
      
      if (searchError) throw searchError;
      
      const targetUser = data.users?.find((u: any) => u.email === newCredit.user_email);
      
      if (!targetUser) {
        toast({
          title: "Error",
          description: "User not found with that email",
          variant: "destructive",
        });
        return;
      }

      const { data: currentUser } = await supabase.auth.getUser();

      const { error } = await supabase.from("promotional_credits").insert([{
        user_id: targetUser.id,
        credit_amount: parseFloat(newCredit.credit_amount),
        credit_type: newCredit.credit_type,
        reason: newCredit.reason || null,
        expires_at: newCredit.expires_at || null,
        granted_by: currentUser?.user?.id,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotional credit granted successfully",
      });

      setIsDialogOpen(false);
      setNewCredit({
        user_email: "",
        credit_amount: "",
        credit_type: "general",
        reason: "",
        expires_at: "",
      });
      fetchCredits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredCredits = credits.filter((credit) =>
    credit.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    credit.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "used": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "expired": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "cancelled": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "sms": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "email": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "subscription": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "general": return "bg-green-500/10 text-green-500 border-green-500/20";
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
              <Gift className="w-5 h-5" />
              Promotional Credits
            </CardTitle>
            <CardDescription>
              Grant and manage promotional credits for businesses
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Grant Credit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Promotional Credit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input
                    placeholder="user@example.com"
                    value={newCredit.user_email}
                    onChange={(e) => setNewCredit({ ...newCredit, user_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit Amount</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newCredit.credit_amount}
                    onChange={(e) => setNewCredit({ ...newCredit, credit_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit Type</Label>
                  <Select
                    value={newCredit.credit_type}
                    onValueChange={(value) => setNewCredit({ ...newCredit, credit_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="sms">SMS Credits</SelectItem>
                      <SelectItem value="email">Email Credits</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="Promotional campaign, compensation, etc."
                    value={newCredit.reason}
                    onChange={(e) => setNewCredit({ ...newCredit, reason: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newCredit.expires_at}
                    onChange={(e) => setNewCredit({ ...newCredit, expires_at: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGrantCredit}>
                    Grant Credit
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search credits..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCredits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No promotional credits found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCredits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-mono text-xs">
                      {credit.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold">
                      {credit.credit_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(credit.credit_type)}>
                        {credit.credit_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{credit.used_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(credit.status)}>
                        {credit.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {credit.expires_at
                        ? format(new Date(credit.expires_at), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

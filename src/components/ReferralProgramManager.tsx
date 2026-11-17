import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Gift, Share2, Copy, Settings, TrendingUp, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

interface ReferralProgram {
  id: string;
  name: string;
  is_active: boolean;
  referrer_reward_type: string;
  referrer_reward_value: number;
  referee_reward_type: string;
  referee_reward_value: number;
  min_purchase_amount: number;
}

interface ReferralCode {
  id: string;
  code: string;
  uses_count: number;
  max_uses: number | null;
  is_active: boolean;
  customer: { name: string; email: string | null } | null;
}

interface Referral {
  id: string;
  status: string;
  referrer_reward_given: boolean;
  referee_reward_given: boolean;
  created_at: string;
  referrer: { name: string } | null;
  referee: { name: string } | null;
}

export const ReferralProgramManager = () => {
  const { user } = useBusiness();
  const { format: formatPrice } = useCurrency();
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch or create program
      const { data: programData } = await supabase
        .from("referral_programs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (programData) {
        setProgram(programData);
      } else {
        // Create default program
        const { data: newProgram, error } = await supabase
          .from("referral_programs")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (!error && newProgram) {
          setProgram(newProgram);
        }
      }

      // Fetch referral codes
      const { data: codesData } = await supabase
        .from("referral_codes")
        .select(`
          *,
          customer:customers(name, email)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setCodes(codesData || []);

      // Fetch referrals
      const { data: referralsData } = await supabase
        .from("referrals")
        .select(`
          *,
          referrer:customers!referrals_referrer_id_fkey(name),
          referee:customers!referrals_referee_id_fkey(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setReferrals(referralsData || []);

      // Fetch customers without referral codes
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, email")
        .eq("user_id", user.id);

      const existingCustomerIds = new Set((codesData || []).map(c => c.customer_id));
      setCustomers((customersData || []).filter(c => !existingCustomerIds.has(c.id)));

    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgram = async (updates: Partial<ReferralProgram>) => {
    if (!program) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("referral_programs")
        .update(updates)
        .eq("id", program.id);

      if (error) throw error;

      setProgram({ ...program, ...updates });
      toast({ title: "Program updated" });
    } catch (error) {
      toast({ title: "Error updating program", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateCode = async () => {
    if (!user || !selectedCustomer) return;

    try {
      const code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { error } = await supabase
        .from("referral_codes")
        .insert({
          user_id: user.id,
          customer_id: selectedCustomer,
          code,
        });

      if (error) throw error;

      toast({ title: "Referral code generated" });
      setSelectedCustomer("");
      fetchData();
    } catch (error) {
      toast({ title: "Error generating code", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    const storeUrl = `${window.location.origin}/store/${user?.id}?ref=${code}`;
    navigator.clipboard.writeText(storeUrl);
    toast({ title: "Referral link copied!" });
  };

  const toggleCodeStatus = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("referral_codes")
        .update({ is_active: isActive })
        .eq("id", codeId);

      if (error) throw error;

      setCodes(codes.map(c => c.id === codeId ? { ...c, is_active: isActive } : c));
      toast({ title: `Code ${isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
      toast({ title: "Error updating code", variant: "destructive" });
    }
  };

  const getRewardLabel = (type: string, value: number) => {
    switch (type) {
      case "points":
        return `${value} loyalty points`;
      case "discount_percent":
        return `${value}% discount`;
      case "discount_fixed":
        return formatPrice(value);
      default:
        return `${value}`;
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading referral program...</p>
      </Card>
    );
  }

  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(r => r.status === "completed").length;
  const totalCodes = codes.length;
  const activeCodes = codes.filter(c => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[hsl(217_91%_60%)]/10">
                <Share2 className="w-5 h-5 text-[hsl(217_91%_60%)]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Codes</p>
                <p className="text-2xl font-bold">{activeCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {totalReferrals > 0 ? Math.round((completedReferrals / totalReferrals) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-2">
            <Share2 className="w-4 h-4" />
            Referral Codes
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Users className="w-4 h-4" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Program Settings</CardTitle>
                  <CardDescription>Configure your referral program rewards</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Program Active</Label>
                  <Switch
                    checked={program?.is_active || false}
                    onCheckedChange={(checked) => updateProgram({ is_active: checked })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Referrer Rewards */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Referrer Reward (Person who refers)
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reward Type</Label>
                    <Select
                      value={program?.referrer_reward_type || "points"}
                      onValueChange={(value) => updateProgram({ referrer_reward_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Loyalty Points</SelectItem>
                        <SelectItem value="discount_percent">Discount Percentage</SelectItem>
                        <SelectItem value="discount_fixed">Fixed Discount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reward Value</Label>
                    <Input
                      type="number"
                      value={program?.referrer_reward_value || 0}
                      onChange={(e) => updateProgram({ referrer_reward_value: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Referee Rewards */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Referee Reward (New customer)
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reward Type</Label>
                    <Select
                      value={program?.referee_reward_type || "discount_percent"}
                      onValueChange={(value) => updateProgram({ referee_reward_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Loyalty Points</SelectItem>
                        <SelectItem value="discount_percent">Discount Percentage</SelectItem>
                        <SelectItem value="discount_fixed">Fixed Discount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reward Value</Label>
                    <Input
                      type="number"
                      value={program?.referee_reward_value || 0}
                      onChange={(e) => updateProgram({ referee_reward_value: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Minimum Purchase */}
              <div className="space-y-2">
                <Label>Minimum Purchase Amount (for referral to complete)</Label>
                <Input
                  type="number"
                  value={program?.min_purchase_amount || 0}
                  onChange={(e) => updateProgram({ min_purchase_amount: Number(e.target.value) })}
                  placeholder="0 for no minimum"
                />
              </div>

              {/* Summary */}
              {program && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Program Summary:</strong> When a customer refers a friend, the referrer gets{" "}
                      <Badge variant="secondary">{getRewardLabel(program.referrer_reward_type, program.referrer_reward_value)}</Badge>{" "}
                      and the new customer gets{" "}
                      <Badge variant="secondary">{getRewardLabel(program.referee_reward_type, program.referee_reward_value)}</Badge>
                      {program.min_purchase_amount > 0 && (
                        <> after making a minimum purchase of {formatPrice(program.min_purchase_amount)}</>
                      )}.
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Codes</CardTitle>
              <CardDescription>Generate and manage customer referral codes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Generate Code */}
              <div className="flex gap-2">
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.email && `(${c.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={generateCode} disabled={!selectedCustomer}>
                  Generate Code
                </Button>
              </div>

              {/* Codes Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{code.customer?.name}</p>
                          <p className="text-sm text-muted-foreground">{code.customer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{code.code}</code>
                      </TableCell>
                      <TableCell>
                        {code.uses_count}
                        {code.max_uses && ` / ${code.max_uses}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={code.is_active ? "default" : "secondary"}>
                          {code.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={code.is_active}
                            onCheckedChange={(checked) => toggleCodeStatus(code.id, checked)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {codes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No referral codes yet. Generate one above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>Track all referrals and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rewards</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell>{ref.referrer?.name || "Unknown"}</TableCell>
                      <TableCell>{ref.referee?.name || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          ref.status === "completed" ? "default" :
                          ref.status === "pending" ? "secondary" : "destructive"
                        }>
                          {ref.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ref.referrer_reward_given && (
                            <Badge variant="outline" className="text-green-600 gap-1">Referrer <CheckCircle className="w-3 h-3" /></Badge>
                          )}
                          {ref.referee_reward_given && (
                            <Badge variant="outline" className="text-green-600 gap-1">Referee <CheckCircle className="w-3 h-3" /></Badge>
                          )}
                          {!ref.referrer_reward_given && !ref.referee_reward_given && (
                            <span className="text-muted-foreground text-sm">Pending</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {referrals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No referrals yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

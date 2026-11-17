import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FlaskConical, Plus, Play, Pause, Trophy, Mail, MessageSquare, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { determineCampaignWinner, CampaignWinnerCriterion } from "@/lib/campaign-ab";

interface ABTest {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  variant_a_subject: string | null;
  variant_a_content: string;
  variant_b_subject: string | null;
  variant_b_content: string;
  split_percentage: number;
  winner_criteria: string;
  winner_variant: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ABRecipientStats {
  variant: string;
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export const CampaignABTesting = () => {
  const { user } = useBusiness();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [newTest, setNewTest] = useState({
    name: "",
    campaign_type: "email",
    variant_a_subject: "",
    variant_a_content: "",
    variant_b_subject: "",
    variant_b_content: "",
    split_percentage: 50,
    winner_criteria: "open_rate",
  });

  // Fetch A/B tests
  const { data: tests = [], refetch } = useQuery({
    queryKey: ["ab-tests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("campaign_ab_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ABTest[];
    },
    enabled: !!user,
  });

  // Fetch recipients for selected test
  const { data: recipientStats = [] } = useQuery({
    queryKey: ["ab-recipients", selectedTest?.id],
    queryFn: async () => {
      if (!selectedTest) return [];
      const { data, error } = await supabase
        .from("campaign_ab_recipients")
        .select("variant, status")
        .eq("ab_test_id", selectedTest.id);
      
      if (error) throw error;

      // Calculate stats per variant
      const stats: Record<string, ABRecipientStats> = {
        A: { variant: "A", total: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
        B: { variant: "B", total: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
      };

      data?.forEach(r => {
        const v = r.variant as "A" | "B";
        stats[v].total++;
        if (r.status === "sent" || r.status === "delivered" || r.status === "opened" || r.status === "clicked" || r.status === "converted") {
          stats[v].sent++;
        }
        if (r.status === "opened" || r.status === "clicked" || r.status === "converted") {
          stats[v].opened++;
        }
        if (r.status === "clicked" || r.status === "converted") {
          stats[v].clicked++;
        }
        if (r.status === "converted") {
          stats[v].converted++;
        }
      });

      return Object.values(stats);
    },
    enabled: !!selectedTest,
  });

  // Fetch customers for recipient selection
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-ab", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: totalRecipients = 0 } = useQuery({
    queryKey: ["ab-recipient-total", user?.id, tests.map((test) => test.id).join(",")],
    queryFn: async () => {
      if (!user || tests.length === 0) return 0;
      const { count, error } = await supabase
        .from("campaign_ab_recipients")
        .select("id", { count: "exact", head: true })
        .in("ab_test_id", tests.map((test) => test.id));
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && tests.length > 0,
  });

  const createTest = async () => {
    if (!user) return;

    if (!newTest.name || !newTest.variant_a_content || !newTest.variant_b_content) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("campaign_ab_tests")
        .insert({
          user_id: user.id,
          name: newTest.name,
          campaign_type: newTest.campaign_type,
          variant_a_subject: newTest.variant_a_subject || null,
          variant_a_content: newTest.variant_a_content,
          variant_b_subject: newTest.variant_b_subject || null,
          variant_b_content: newTest.variant_b_content,
          split_percentage: newTest.split_percentage,
          winner_criteria: newTest.winner_criteria,
        });

      if (error) throw error;

      toast({ title: "A/B test created" });
      setShowCreateDialog(false);
      setNewTest({
        name: "",
        campaign_type: "email",
        variant_a_subject: "",
        variant_a_content: "",
        variant_b_subject: "",
        variant_b_content: "",
        split_percentage: 50,
        winner_criteria: "open_rate",
      });
      refetch();
    } catch (error) {
      toast({ title: "Error creating test", variant: "destructive" });
    }
  };

  const startTest = async (test: ABTest) => {
    if (!user) return;

    // Get eligible customers
    const eligibleCustomers = customers.filter(c => 
      test.campaign_type === "email" ? c.email : c.phone
    );

    if (eligibleCustomers.length === 0) {
      toast({ 
        title: "No eligible recipients", 
        description: `No customers with ${test.campaign_type === "email" ? "email addresses" : "phone numbers"} found`,
        variant: "destructive" 
      });
      return;
    }

    try {
      // Assign recipients to variants based on split
      const splitIndex = Math.floor(eligibleCustomers.length * (test.split_percentage / 100));
      const shuffled = [...eligibleCustomers].sort(() => Math.random() - 0.5);

      const recipients = shuffled.map((customer, index) => ({
        ab_test_id: test.id,
        customer_id: customer.id,
        recipient: test.campaign_type === "email" ? customer.email : customer.phone,
        variant: index < splitIndex ? "A" : "B",
      }));

      // Insert recipients
      const { error: recipientsError } = await supabase
        .from("campaign_ab_recipients")
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      // Update test status
      const { error: testError } = await supabase
        .from("campaign_ab_tests")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", test.id);

      if (testError) throw testError;

      toast({ 
        title: "A/B test started", 
        description: `${recipients.length} recipients assigned (${splitIndex} to A, ${recipients.length - splitIndex} to B)` 
      });
      refetch();
    } catch (error) {
      console.error("Error starting test:", error);
      toast({ title: "Error starting test", variant: "destructive" });
    }
  };

  const declareWinner = async (test: ABTest) => {
    const result = determineCampaignWinner(
      recipientStats.map((stats) => ({
        variant: stats.variant as "A" | "B",
        sent: stats.sent,
        opened: stats.opened,
        clicked: stats.clicked,
        converted: stats.converted,
      })),
      test.winner_criteria as CampaignWinnerCriterion,
    );
    if (!result.winner) {
      toast({
        title: result.reason === "tie" ? "The test is tied" : "Not enough performance data",
        description: "Both variants must have sent recipients and a measurable difference before a winner can be declared.",
        variant: "destructive",
      });
      return;
    }
    const winner = result.winner;
    try {
      const { error } = await supabase
        .from("campaign_ab_tests")
        .update({ 
          status: "completed", 
          winner_variant: winner,
          completed_at: new Date().toISOString() 
        })
        .eq("id", test.id);

      if (error) throw error;

      toast({ title: `Variant ${winner} declared as winner` });
      refetch();
      setSelectedTest(null);
    } catch (error) {
      toast({ title: "Error declaring winner", variant: "destructive" });
    }
  };

  const getRate = (count: number, total: number) => {
    if (total === 0) return "0%";
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  // Stats
  const runningTests = tests.filter(t => t.status === "running").length;
  const completedTests = tests.filter(t => t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <FlaskConical className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{tests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Running</p>
                <p className="text-2xl font-bold">{runningTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recipients</p>
                <p className="text-2xl font-bold">{totalRecipients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create A/B Test
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input
                  placeholder="e.g., Holiday Sale Subject Line Test"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <Select
                  value={newTest.campaign_type}
                  onValueChange={(v) => setNewTest({ ...newTest, campaign_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email
                      </span>
                    </SelectItem>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> SMS
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variants */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Variant A */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge>A</Badge> Variant A
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {newTest.campaign_type === "email" && (
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input
                        placeholder="Email subject..."
                        value={newTest.variant_a_subject}
                        onChange={(e) => setNewTest({ ...newTest, variant_a_subject: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Message content..."
                      value={newTest.variant_a_content}
                      onChange={(e) => setNewTest({ ...newTest, variant_a_content: e.target.value })}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Variant B */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="secondary">B</Badge> Variant B
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {newTest.campaign_type === "email" && (
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input
                        placeholder="Email subject..."
                        value={newTest.variant_b_subject}
                        onChange={(e) => setNewTest({ ...newTest, variant_b_subject: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Message content..."
                      value={newTest.variant_b_content}
                      onChange={(e) => setNewTest({ ...newTest, variant_b_content: e.target.value })}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Split & Criteria */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Traffic Split (A: {newTest.split_percentage}% / B: {100 - newTest.split_percentage}%)</Label>
                <Slider
                  value={[newTest.split_percentage]}
                  onValueChange={([v]) => setNewTest({ ...newTest, split_percentage: v })}
                  min={10}
                  max={90}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Winner Criteria</Label>
                <Select
                  value={newTest.winner_criteria}
                  onValueChange={(v) => setNewTest({ ...newTest, winner_criteria: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_rate">Open Rate</SelectItem>
                    <SelectItem value="click_rate">Click Rate</SelectItem>
                    <SelectItem value="conversion">Conversion Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={createTest} className="w-full">
              Create Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>A/B Tests</CardTitle>
          <CardDescription>Manage and monitor your campaign experiments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Split</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {test.campaign_type === "email" ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                      {test.campaign_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{test.split_percentage}% / {100 - test.split_percentage}%</TableCell>
                  <TableCell>
                    <Badge variant={
                      test.status === "running" ? "default" :
                      test.status === "completed" ? "secondary" :
                      "outline"
                    }>
                      {test.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {test.winner_variant ? (
                      <Badge className="bg-green-500">
                        <Trophy className="w-3 h-3 mr-1" />
                        Variant {test.winner_variant}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {test.status === "draft" && (
                        <Button size="sm" onClick={() => startTest(test)}>
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {test.status === "running" && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedTest(test)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Results
                        </Button>
                      )}
                      {test.status === "completed" && (
                        <Button size="sm" variant="ghost" onClick={() => setSelectedTest(test)}>
                          View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No A/B tests yet. Create one to start experimenting!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={(open) => !open && setSelectedTest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTest?.name} - Results</DialogTitle>
          </DialogHeader>
          {selectedTest && (
            <div className="space-y-6">
              {/* Results Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                {recipientStats.map((stats) => (
                  <Card key={stats.variant} className={selectedTest.winner_variant === stats.variant ? "ring-2 ring-green-500" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge variant={stats.variant === "A" ? "default" : "secondary"}>
                            {stats.variant}
                          </Badge>
                          Variant {stats.variant}
                        </span>
                        {selectedTest.winner_variant === stats.variant && (
                          <Trophy className="w-5 h-5 text-green-600" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recipients</span>
                          <span className="font-medium">{stats.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sent</span>
                          <span className="font-medium">{stats.sent} ({getRate(stats.sent, stats.total)})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Opened</span>
                          <span className="font-medium">{stats.opened} ({getRate(stats.opened, stats.sent)})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Clicked</span>
                          <span className="font-medium">{stats.clicked} ({getRate(stats.clicked, stats.sent)})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Converted</span>
                          <span className="font-medium">{stats.converted} ({getRate(stats.converted, stats.sent)})</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Calculate Winner */}
              {selectedTest.status === "running" && (
                <div className="flex justify-end">
                  <Button onClick={() => declareWinner(selectedTest)}>
                    Calculate Winner from {selectedTest.winner_criteria.replace("_", " ")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

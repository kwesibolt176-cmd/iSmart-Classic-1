import { useState, useEffect } from "react";
import { UserCog, LogIn, AlertTriangle, X, Search, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface BusinessProfile {
  user_id: string;
  business_name: string;
  business_email: string | null;
  plan_tier: string | null;
  industry: string;
}

interface ImpersonationSession {
  id: string;
  target_user_id: string;
  target_user_email: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

export const ImpersonationTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ImpersonationSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<ImpersonationSession[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkActiveSession();
    fetchSessionHistory();
  }, []);

  const checkActiveSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session, error } = await supabase
        .from("impersonation_sessions")
        .select("id, target_user_id, target_user_email, started_at, ended_at, is_active")
        .eq("admin_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error checking impersonation session:", error);
        return;
      }

      setActiveSession(session);
    } catch (error) {
      console.error("Error checking active session:", error);
    }
  };

  const fetchSessionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("impersonation_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSessionHistory(data || []);
    } catch (error) {
      console.error("Error fetching session history:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setBusinesses([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("user_id, business_name, business_email, plan_tier, industry")
        .or(`business_name.ilike.%${searchQuery}%,business_email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error: any) {
      toast({
        title: "Search Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImpersonate = async (business: BusinessProfile) => {
    if (!business.business_email) {
      toast({
        title: "Error",
        description: "This business has no email configured",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) {
        throw new Error("Not authenticated");
      }

      // End any existing active sessions first
      await supabase
        .from("impersonation_sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("admin_user_id", currentUser.user.id)
        .eq("is_active", true);

      // Create new impersonation session
      const { data: newSession, error: sessionError } = await supabase
        .from("impersonation_sessions")
        .insert({
          admin_user_id: currentUser.user.id,
          target_user_id: business.user_id,
          target_user_email: business.business_email,
          is_active: true,
          user_agent: navigator.userAgent,
        })
        .select("id, target_user_id, target_user_email, started_at, ended_at, is_active")
        .single();

      if (sessionError) throw sessionError;

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        user_id: currentUser.user.id,
        action_type: "impersonation_start",
        entity_type: "user",
        entity_id: business.user_id,
        metadata: {
          target_email: business.business_email,
          target_business: business.business_name,
        },
        user_agent: navigator.userAgent,
      });

      setActiveSession(newSession);
      
      toast({
        title: "Impersonation Started",
        description: `Now viewing as ${business.business_name}. You will see their dashboard.`,
      });

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error: any) {
      console.error("Impersonation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start impersonation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // End the impersonation session
      const { error } = await supabase
        .from("impersonation_sessions")
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq("admin_user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "impersonation_end",
        entity_type: "user",
        entity_id: activeSession?.target_user_id,
        metadata: {
          target_email: activeSession?.target_user_email,
          duration_minutes: activeSession ? 
            Math.round((Date.now() - new Date(activeSession.started_at).getTime()) / 60000) : 0,
        },
      });

      setActiveSession(null);
      fetchSessionHistory();

      toast({
        title: "Impersonation Ended",
        description: "Returned to admin view.",
      });

      navigate("/admin");
    } catch (error: any) {
      console.error("Error ending impersonation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to end impersonation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            User Impersonation
          </CardTitle>
          <CardDescription>
            Login as any user for support and debugging purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> All impersonation sessions are tracked and logged.
              Use only for legitimate support purposes.
            </AlertDescription>
          </Alert>

          {activeSession ? (
            <div className="space-y-4">
              <Alert className="border-orange-500/20 bg-orange-500/10">
                <UserCog className="w-4 h-4 text-orange-500" />
                <AlertDescription className="text-orange-500">
                  <strong>Active Impersonation Session</strong>
                  <p className="mt-1">Currently viewing as: {activeSession.target_user_email}</p>
                  <p className="text-xs mt-1">
                    Started: {format(new Date(activeSession.started_at), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleStopImpersonation}
                variant="destructive"
                className="w-full gap-2"
                disabled={loading}
              >
                <X className="w-4 h-4" />
                {loading ? "Ending Session..." : "Stop Impersonation & Return to Admin"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search by business name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={searchLoading} className="gap-2">
                  <Search className="w-4 h-4" />
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>

              {businesses.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businesses.map((business) => (
                        <TableRow key={business.user_id}>
                          <TableCell className="font-medium">{business.business_name}</TableCell>
                          <TableCell>{business.business_email || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{business.industry}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{business.plan_tier || "Free"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleImpersonate(business)}
                              disabled={loading || !business.business_email}
                              className="gap-1"
                            >
                              <LogIn className="w-3 h-3" />
                              Impersonate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {searchQuery && businesses.length === 0 && !searchLoading && (
                <p className="text-center text-muted-foreground py-4">
                  No businesses found matching "{searchQuery}"
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Impersonation Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No session history</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionHistory.map((session) => {
                  const duration = session.ended_at
                    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
                    : null;
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {session.target_user_email}
                      </TableCell>
                      <TableCell>{format(new Date(session.started_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell>
                        {session.ended_at ? format(new Date(session.ended_at), "MMM d, HH:mm") : "-"}
                      </TableCell>
                      <TableCell>
                        {duration !== null ? `${duration} min` : "Ongoing"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.is_active ? "default" : "secondary"}>
                          {session.is_active ? "Active" : "Ended"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

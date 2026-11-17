import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Key, Save, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifyAccount } from "@/lib/verify-account";

const OPERATOR_MAP: Record<string, string> = {
  MTN: "mtn",
  Telecel: "telecel",
  "Airtel-Tigo": "airteltigo",
};

export const AccountValidationTab = () => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);

  // MoMo form
  const [momoPhone, setMomoPhone] = useState("");
  const [momoOperator, setMomoOperator] = useState("MTN");
  const [momoUsername, setMomoUsername] = useState("");

  // Bank form
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankUsername, setBankUsername] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    checkExistingKey();
  }, []);

  const checkExistingKey = async () => {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "secret_iverify_api_key")
        .maybeSingle();
      if (data?.setting_value) {
        setKeyConfigured(true);
      }
    } catch (err) {
      console.error("Error checking iVerify key:", err);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter the iVerify API key");
      return;
    }
    setSavingKey(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("update-integration-secrets", {
        body: {
          integrationId: "iverify",
          secrets: { api_key: apiKey.trim() },
        },
      });
      if (error) throw error;

      toast.success("iVerify API key saved successfully");
      setKeyConfigured(true);
      setApiKey("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save API key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleVerify = async (channel: "mobile" | "bank") => {
    setVerifying(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const payload =
        channel === "mobile"
          ? {
              channel: "mobile",
              mobile_number: momoPhone,
              account_number: "",
              bank_code: "",
              operator: OPERATOR_MAP[momoOperator] || "mtn",
            }
          : {
              channel: "bank",
              mobile_number: "",
              account_number: bankAccount,
              bank_code: bankCode,
              operator: "mtn",
            };


      const data = await verifyAccount(payload);
      setResult(data);
      toast.success("Verification complete");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
      setResult({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            iVerify API Key
          </CardTitle>
          <CardDescription>
            Configure the API key used for identity verification via iVerify (Shrinq Ghana).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={keyConfigured ? "default" : "destructive"}>
              {keyConfigured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="iverify-key">API Key</Label>
              <div className="relative">
                <Input
                  id="iverify-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={keyConfigured ? "Enter new key to update..." : "Enter iVerify API key..."}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleSaveKey} disabled={savingKey || !apiKey.trim()}>
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Account Verification
          </CardTitle>
          <CardDescription>
            Verify Mobile Money or Bank account holder identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mobile">
            <TabsList className="mb-4">
              <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
              <TabsTrigger value="bank">Bank Account</TabsTrigger>
            </TabsList>

            <TabsContent value="mobile" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="0558194323"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select value={momoOperator} onValueChange={setMomoOperator}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN</SelectItem>
                      <SelectItem value="Telecel">Telecel</SelectItem>
                      <SelectItem value="Airtel-Tigo">Airtel-Tigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={momoUsername}
                    onChange={(e) => setMomoUsername(e.target.value)}
                    placeholder="e.g. steve.ameyaw"
                  />
                </div>
              </div>
              <Button onClick={() => handleVerify("mobile")} disabled={verifying || !momoPhone}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Verify MoMo Account
              </Button>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="2013002681590"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Code</Label>
                  <Input
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    placeholder="e.g. ECB"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={bankUsername}
                    onChange={(e) => setBankUsername(e.target.value)}
                    placeholder="e.g. steve.ameyaw"
                  />
                </div>
              </div>
              <Button onClick={() => handleVerify("bank")} disabled={verifying || !bankAccount || !bankCode}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Verify Bank Account
              </Button>
            </TabsContent>
          </Tabs>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 rounded-lg border bg-muted/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                {result.error ? (
                  <><XCircle className="w-4 h-4 text-destructive" /> Verification Failed</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> Verification Result</>
                )}
              </h4>
              <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64 text-muted-foreground">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

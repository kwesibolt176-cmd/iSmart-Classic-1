import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/function-errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type SecretStatus = { configured: boolean; source: "environment" | "encrypted_store" | null; updatedAt: string | null };
type SecretCardProps = {
  functionName: "manage-ai-secret" | "manage-imail-secret";
  providerName: string;
  description: string;
  unavailableDescription: string;
  minimumLength: number;
  canTest?: boolean;
};

const SecretCard = ({ functionName, providerName, description, unavailableDescription, minimumLength, canTest }: SecretCardProps) => {
  const [status, setStatus] = useState<SecretStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  const invoke = async (method: "GET" | "PUT" | "POST" | "DELETE", body?: unknown) => {
    const { data, error } = await supabase.functions.invoke(functionName, { method, body });
    if (error) throw { invokeError: error, data };
    return data as SecretStatus;
  };

  const errorMessage = async (error: unknown, fallback: string) => {
    const failure = error as { invokeError?: unknown; data?: unknown };
    return functionErrorMessage(failure.invokeError ?? error, failure.data, fallback);
  };

  const loadStatus = async () => {
    try {
      setStatus(await invoke("GET"));
    } catch (error) {
      toast.error(await errorMessage(error, `Could not load ${providerName} secret status`));
    }
  };

  useEffect(() => { void loadStatus(); }, []);

  const save = async () => {
    if (apiKey.trim().length < minimumLength) return;
    setBusy(true);
    try {
      setStatus(await invoke("PUT", { apiKey: apiKey.trim() }));
      setApiKey("");
      toast.success(status?.configured ? `${providerName} key rotated` : `${providerName} key configured`);
    } catch (error) {
      toast.error(await errorMessage(error, `Could not save ${providerName} key`));
    } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true);
    try {
      await invoke("POST");
      toast.success(`${providerName} connection verified`);
    } catch (error) {
      toast.error(await errorMessage(error, `${providerName} connection test failed`));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      setStatus(await invoke("DELETE"));
      toast.success(`Stored ${providerName} key removed`);
    } catch (error) {
      toast.error(await errorMessage(error, `Could not remove ${providerName} key`));
    } finally { setBusy(false); }
  };

  const environmentOverride = status?.source === "environment";
  const inputId = `${functionName}-api-key`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />{providerName} API key</CardTitle>
        <CardDescription>{description}<br />Status: {status?.configured ? `Configured via ${status.source === "environment" ? "server environment" : "encrypted store"}` : "Not configured"}{status?.updatedAt ? ` · Updated ${new Date(status.updatedAt).toLocaleString()}` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={inputId}>{status?.configured ? "Rotate key" : "API key"}</Label>
          <Input id={inputId} type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={`Paste a new ${providerName} API key`} disabled={busy || environmentOverride} />
        </div>
        {environmentOverride && <p className="text-sm text-muted-foreground">The server environment takes precedence. Remove that variable before managing the key here.</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={busy || environmentOverride || apiKey.trim().length < minimumLength}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{status?.configured ? "Rotate Key" : "Save Key"}</Button>
          {canTest && <Button variant="outline" onClick={test} disabled={busy || !status?.configured}>Test Connection</Button>}
          {status?.configured && !environmentOverride && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive" disabled={busy}>Remove Key</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Remove the {providerName} key?</AlertDialogTitle><AlertDialogDescription>{unavailableDescription}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Remove Key</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AISecretsTab = () => (
  <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Platform Secrets</h1><p className="text-muted-foreground">Securely manage server-side provider credentials.</p></div>
    <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>Encrypted server-side storage</AlertTitle><AlertDescription>Keys are encrypted with AES-GCM before storage, are never returned to this browser, and all changes are recorded in Audit Logs.</AlertDescription></Alert>
    <SecretCard functionName="manage-imail-secret" providerName="iMail" description="Used server-side for SMS, plain email, and HTML email delivery." unavailableDescription="Email and SMS delivery will stop until another key is configured." minimumLength={16} />
    <SecretCard functionName="manage-ai-secret" providerName="Gemini" description="Used server-side for AI product image generation and analysis." unavailableDescription="AI image generation and analysis will stop until another key is configured." minimumLength={20} canTest />
  </div>
);

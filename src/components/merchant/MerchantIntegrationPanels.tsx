import { useCallback, useEffect, useState } from "react";
import { callMerchantApi, createIdempotencyKey } from "@/lib/merchant-api";
import { downloadMerchantBinary } from "@/lib/merchant-binary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw } from "lucide-react";

const merchantBusinessId = () => localStorage.getItem("ismart_business_id") || "";

export function MerchantTeamsPanel() {
  const [teams, setTeams] = useState<Array<{ id: string; name: string; memberCount?: number; pendingInviteCount?: number }>>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const id = merchantBusinessId();
    if (!id) return;
    setLoading(true);
    try {
      const result = await callMerchantApi<{ items?: typeof teams } | typeof teams>("listTeams", { path: { id } });
      setTeams(Array.isArray(result) ? result : result.items || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load Merchant teams"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const create = async () => {
    const id = merchantBusinessId();
    if (!id || !name.trim()) return;
    setLoading(true);
    try {
      await callMerchantApi("createTeam", { path: { id }, body: { name: name.trim() } });
      setName("");
      await load();
      toast.success("Merchant team created");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create team"); }
    finally { setLoading(false); }
  };
  return <Card><CardHeader><CardTitle className="text-base">Merchant API teams</CardTitle></CardHeader><CardContent className="space-y-3">
    <div className="flex gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New team name" /><Button onClick={create} disabled={loading || !name.trim()}>Create</Button></div>
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {teams.map((team) => <div key={team.id} className="flex items-center justify-between rounded border p-3"><span>{team.name}</span><span className="text-xs text-muted-foreground">{team.memberCount || 0} members · {team.pendingInviteCount || 0} invites</span></div>)}
    {!loading && teams.length === 0 && <p className="text-sm text-muted-foreground">No Merchant API teams yet.</p>}
  </CardContent></Card>;
}

export function MerchantInvoicesPanel() {
  const [items, setItems] = useState<Array<{ id: string; number: string | null; status: string; total: string; currency: string; customer?: { name?: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const id = merchantBusinessId(); if (!id) return;
    setLoading(true);
    try {
      const result = await callMerchantApi<{ items?: typeof items }>("listInvoices", { path: { id }, query: { limit: 50 } });
      setItems(result.items || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load Merchant invoices"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const download = async (invoiceId: string, number: string | null) => {
    try { await downloadMerchantBinary("invoicePdf", { id: merchantBusinessId(), invoiceId }, `${number || "invoice"}.pdf`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not download invoice"); }
  };
  return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Merchant API invoices</CardTitle><Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-2">
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {items.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-3 rounded border p-3"><div><p className="font-medium">{invoice.number || "Draft invoice"}</p><p className="text-xs text-muted-foreground">{invoice.customer?.name || "Customer"} · {invoice.currency} {invoice.total}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{invoice.status}</Badge>{invoice.number && <Button size="sm" variant="ghost" onClick={() => download(invoice.id, invoice.number)}><Download className="h-4 w-4" /></Button>}</div></div>)}
    {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">No upstream invoices yet. Existing local invoices remain available below.</p>}
  </CardContent></Card>;
}

export function MerchantSettlementPanel() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [runs, setRuns] = useState<Array<{ id: string; status: string; amount?: string; currency?: string; createdAt?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const id = merchantBusinessId(); if (!id) return;
    setLoading(true);
    try {
      const [savedConfig, savedRuns] = await Promise.all([
        callMerchantApi<Record<string, unknown>>("getSettlement", { path: { id } }).catch(() => null),
        callMerchantApi<{ items?: typeof runs }>("listSettlementRuns", { path: { id } }),
      ]);
      setConfig(savedConfig); setRuns(savedRuns.items || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load Merchant settlements"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const settleNow = async () => {
    const id = merchantBusinessId(); if (!id || !window.confirm("Start a settlement now? This can move funds to the configured destination.")) return;
    setLoading(true);
    try { await callMerchantApi("settleNow", { path: { id }, idempotencyKey: createIdempotencyKey("settlement") }); await load(); toast.success("Settlement requested"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Settlement request failed"); }
    finally { setLoading(false); }
  };
  return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Merchant settlement service</CardTitle><Button onClick={settleNow} disabled={loading || !config}>Settle now</Button></div></CardHeader><CardContent className="space-y-2">
    <p className="text-sm text-muted-foreground">{config ? "Upstream settlement configuration is active." : "No upstream settlement configuration was found."}</p>
    {runs.slice(0, 10).map((run) => <div key={run.id} className="flex justify-between rounded border p-3"><span>{run.currency || "GHS"} {run.amount || "—"}</span><Badge variant="outline">{run.status}</Badge></div>)}
  </CardContent></Card>;
}

export function MerchantRiskPanel() {
  const [profile, setProfile] = useState<{ missing?: string[] } | null>(null);
  const [rating, setRating] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const id = merchantBusinessId(); if (!id) return;
    setLoading(true);
    try {
      const [riskProfile, riskRating] = await Promise.all([
        callMerchantApi<{ missing?: string[] }>("getBusinessRiskProfile", { path: { id } }),
        callMerchantApi<Record<string, unknown>>("getBusinessRiskRating", { path: { id } }).catch(() => null),
      ]);
      setProfile(riskProfile); setRating(riskRating);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load risk profile"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const recompute = async () => {
    const id = merchantBusinessId(); if (!id) return;
    setLoading(true);
    try { await callMerchantApi("recomputeBusinessRiskRating", { path: { id } }); await load(); toast.success("Risk rating recomputed"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not recompute risk rating"); }
    finally { setLoading(false); }
  };
  return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Merchant risk profile</CardTitle><Button variant="outline" onClick={recompute} disabled={loading || Boolean(profile?.missing?.length)}>Recompute rating</Button></div></CardHeader><CardContent className="space-y-3">
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    <p className="text-sm">Missing inputs: {profile?.missing?.length ? profile.missing.join(", ") : "None"}</p>
    {rating && <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(rating, null, 2)}</pre>}
  </CardContent></Card>;
}

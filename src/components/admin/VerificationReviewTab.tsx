import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

type VerificationRow = {
  id: string;
  business_id: string;
  status: string;
  verification_level: number;
  documents: Record<string, { path?: string; file_name?: string; status?: string }> | null;
  business_profiles?: { business_name?: string; business_email?: string | null } | null;
};

const verifiedField: Record<string, string> = {
  certificate_of_incorporation: "certificate_of_incorporation_verified",
  ghana_card_front: "ghana_card_front_verified",
  ghana_card_back: "ghana_card_back_verified",
  business_registration: "business_registration_verified",
  business_license: "business_license_verified",
  operating_permit: "operating_permit_verified",
  proof_of_address: "proof_of_address_verified",
};

export const VerificationReviewTab = () => {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("business_verifications")
      .select("id,business_id,status,verification_level,documents,business_profiles(business_name,business_email)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as unknown as VerificationRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const openDocument = async (path?: string) => {
    if (!path) return toast.error("This submission has no document path");
    const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message || "Could not open document");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const review = async (row: VerificationRow, key: string, approved: boolean) => {
    const actionKey = `${row.id}:${key}`;
    const reason = reasons[actionKey]?.trim();
    if (!approved && !reason) return toast.error("Enter a rejection reason");
    const docs = { ...(row.documents || {}) };
    docs[key] = { ...docs[key], status: approved ? "approved" : "rejected" };
    const update: Record<string, unknown> = {
      documents: docs,
      status: approved ? "in_progress" : "rejected",
      rejection_reason: approved ? null : reason,
    };
    if (approved && verifiedField[key]) update[verifiedField[key]] = true;
    setWorkingKey(actionKey);
    const { error } = await supabase.from("business_verifications").update(update).eq("id", row.id);
    setWorkingKey(null);
    if (error) return toast.error(error.message);
    toast.success(approved ? "Document approved" : "Document rejected");
    fetchRows();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">KYC Reviews</h2>
        <p className="text-muted-foreground">Review merchant verification documents and decisions.</p>
      </div>
      {rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No verification submissions.</Card>
      ) : rows.map((row) => {
        const documents = Object.entries(row.documents || {});
        return (
          <Card key={row.id} className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{row.business_profiles?.business_name || "Unnamed business"}</h3>
                <p className="text-sm text-muted-foreground">{row.business_profiles?.business_email || "No email"}</p>
              </div>
              <Badge variant="outline">Level {row.verification_level} · {row.status}</Badge>
            </div>
            {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents submitted.</p> : (
              <div className="space-y-3">
                {documents.map(([key, doc]) => {
                  const actionKey = `${row.id}:${key}`;
                  return (
                    <div key={key} className="border rounded-md p-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground">{doc.file_name || "Submitted document"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{doc.status || "pending_review"}</Badge>
                          <Button variant="outline" size="sm" onClick={() => openDocument(doc.path)}>
                            <ExternalLink className="h-4 w-4 mr-1" /> View
                          </Button>
                        </div>
                      </div>
                      {doc.status === "pending_review" && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input placeholder="Reason required when rejecting" value={reasons[actionKey] || ""} onChange={(event) => setReasons((current) => ({ ...current, [actionKey]: event.target.value }))} />
                          <Button size="sm" onClick={() => review(row, key, true)} disabled={workingKey === actionKey}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => review(row, key, false)} disabled={workingKey === actionKey}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
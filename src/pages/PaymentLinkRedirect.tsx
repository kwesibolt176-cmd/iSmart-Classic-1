import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentLinkRedirect() {
  const { code = "" } = useParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("resolve-payment-link", {
        body: { code },
      });
      if (!active) return;
      if (invokeError || !data?.url) {
        setError(data?.error || "This payment link is unavailable or has expired.");
        return;
      }
      window.location.replace(data.url);
    };
    void resolve();
    return () => { active = false; };
  }, [code]);

  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md text-center space-y-3">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Payment link unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Opening secure checkout…</p>
          </>
        )}
      </div>
    </main>
  );
}

import { supabase } from "@/integrations/supabase/client";

export type ISmartStatus = "completed" | "failed" | "pending";

/**
 * Query the iSmart status-check service for a transaction and let the backend
 * reconcile our records (wallet credit, collection/order status) if it resolved.
 */
export async function checkISmartStatus(params: {
  referenceId: string;
  network?: string; // MTN | TELECEL | AT | bank code
  channel?: string; // MOMO | BANK
}): Promise<{ status: ISmartStatus; message?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("ismart-status-check", {
      body: {
        referenceId: params.referenceId,
        network: params.network || "MTN",
        channel: params.channel || "MOMO",
      },
    });

    if (error) return { status: "pending", message: error.message };
    return {
      status: (data?.status as ISmartStatus) || "pending",
      message: data?.message || undefined,
    };
  } catch (err) {
    return { status: "pending", message: (err as Error)?.message };
  }
}

/**
 * Reconcile a batch of pending references against the iSmart status-check
 * service. Returns the number of references that resolved (completed/failed),
 * so callers can refresh their data when something changed.
 */
export async function reconcilePendingReferences(
  items: { reference: string; network?: string; channel?: string }[],
  max = 8
): Promise<number> {
  const seen = new Set<string>();
  const targets = items
    .filter((i) => i.reference && !seen.has(i.reference) && seen.add(i.reference))
    .slice(0, max);
  if (!targets.length) return 0;

  const results = await Promise.all(
    targets.map((t) =>
      checkISmartStatus({ referenceId: t.reference, network: t.network, channel: t.channel })
    )
  );
  return results.filter((r) => r.status !== "pending").length;
}

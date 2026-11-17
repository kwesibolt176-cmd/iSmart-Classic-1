import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/function-errors";

type VerificationInput = {
  businessId: string | undefined;
  provider: string;
  phoneNumber: string;
};

export const verifyFinancialDestination = async (input: VerificationInput) => {
  const { data, error } = await supabase.functions.invoke("verify-financial-destination", { body: input });
  if (error) throw new Error(await functionErrorMessage(error, data, "Could not verify account details"));
  if (!data?.success || !data?.verificationProof || !data?.data?.accountName) {
    throw new Error("Could not verify account details");
  }
  return data as {
    success: true;
    verificationProof: string;
    expiresAt: string;
    data: { accountName: string; accountname: string; provider: string; active: boolean };
  };
};

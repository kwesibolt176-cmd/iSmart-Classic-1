type ChannelResult = { ok: boolean } | null | undefined;

export type InviteDeliveryResponse = {
  email?: ChannelResult;
  sms?: ChannelResult;
  delivered?: boolean;
} | null | undefined;

/**
 * Turns the send-staff-invitation result into the message shown to the admin.
 * Each channel is reported on its own so a failed SMS no longer hides a
 * delivered email. The invite link is never included: it carries the token.
 */
export const describeInviteDelivery = (staffName: string, data: InviteDeliveryResponse, failed: boolean) => {
  const sent: string[] = [];
  const notSent: string[] = [];
  if (data?.email) (data.email.ok ? sent : notSent).push("email");
  if (data?.sms) (data.sms.ok ? sent : notSent).push("SMS");

  if (failed || sent.length === 0) {
    return {
      ok: false,
      title: "Staff added — invite not delivered",
      description: "Check their email address and phone number, then use Resend invite from the staff list.",
    };
  }
  return {
    ok: true,
    title: "Invitation sent",
    description: notSent.length
      ? `Sent to ${staffName} by ${sent.join(" and ")}. ${notSent.join(" and ")} could not be delivered.`
      : `Sent to ${staffName} by ${sent.join(" and ")}. They will set their own PIN from the invite.`,
  };
};

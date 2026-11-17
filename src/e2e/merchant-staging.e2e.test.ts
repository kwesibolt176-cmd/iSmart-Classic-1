import { describe, expect, it } from "vitest";

const enabled = process.env.RUN_MERCHANT_STAGING_E2E === "1";
const baseUrl = process.env.ISMART_MERCHANT_API_URL || "https://stgmerchant-api.ismartghana.com";
const accessToken = process.env.ISMART_STAGING_ACCESS_TOKEN;
const businessId = process.env.ISMART_STAGING_BUSINESS_ID;

describe.skipIf(!enabled)("Merchant API staging contract", () => {
  it("reports a healthy service", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: expect.any(String) });
  });

  it("publishes the required integration operations", async () => {
    const response = await fetch(`${baseUrl}/docs`);
    const html = await response.text();
    expect(response.status).toBe(200);
    for (const operation of [
      "businessAuthGoogleStart", "businessAuthRequestPhoneLogin", "receiveProcessorWebhook",
      "getBusinessInvoicePdf", "getPublicCheckoutLogo", "submitDocument", "confirmDocument",
      "listTeams", "listBusinessInvoices", "getSettlement", "getBusinessRiskProfile",
    ]) expect(html).toContain(`\\"operationId\\":\\"${operation}\\"`);
    for (const path of [
      "/v1/compliance/documents/{id}/confirm",
      "/v1/business/auth/google/start",
      "/v1/business/auth/google/exchange",
      "/v1/business/auth/login/otp/request",
      "/v1/business/auth/login/otp/verify",
      "/v1/businesses/{id}/wallet/payment-methods",
      "/v1/businesses/{id}/wallet/party-lookups",
      "/v1/businesses/{id}/wallet/collections",
      "/v1/businesses/{id}/wallet/payouts",
      "/v1/businesses/{id}/wallet/transfers",
      "/v1/businesses/{id}/invoices/{invoiceId}/pdf",
      "/v1/public/checkouts/{token}/invoice.pdf",
    ]) expect(html).toContain(path);
  }, 20_000);

  it("rejects protected resources without a bearer token", async () => {
    const businessId = "00000000-0000-0000-0000-000000000000";
    const response = await fetch(`${baseUrl}/v1/businesses/${businessId}/teams`);
    expect([401, 403]).toContain(response.status);
  });
});

describe.skipIf(!enabled || !accessToken || !businessId)("Merchant API authenticated staging contract", () => {
  const authenticatedGet = (path: string) => fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  it("resolves the authenticated merchant principal", async () => {
    const response = await authenticatedGet("/v1/auth/me");
    expect(response.status).toBe(200);
    const principal = await response.json() as Record<string, unknown>;
    expect(String(principal.business_id || principal.businessId)).toBe(businessId);
  });

  it("reads the linked business and its live payment methods", async () => {
    const [business, methods] = await Promise.all([
      authenticatedGet(`/v1/businesses/${businessId}`),
      authenticatedGet(`/v1/businesses/${businessId}/wallet/payment-methods`),
    ]);
    expect(business.status).toBe(200);
    expect(methods.status).toBe(200);
    expect(await methods.json()).toMatchObject({ items: expect.any(Array) });
  });

  it("does not grant access to an unrelated business identifier", async () => {
    const response = await authenticatedGet("/v1/businesses/00000000-0000-4000-8000-000000000000");
    expect([403, 404]).toContain(response.status);
  });
});

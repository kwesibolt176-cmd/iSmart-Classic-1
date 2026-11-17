export const joinMerchantApiUrl = (baseUrl: string, path: string) =>
  new URL(`${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`);

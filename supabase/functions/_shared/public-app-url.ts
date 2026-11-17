export const publicAppUrl = () => {
  const configured = Deno.env.get("PUBLIC_APP_URL")?.trim() || "https://dev.classic.ismartghana.com";
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("PUBLIC_APP_URL must use HTTPS");
  return url.toString().replace(/\/+$/, "");
};

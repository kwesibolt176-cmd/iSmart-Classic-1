// Throwaway function used only to verify the deploy-edge-functions.yml
// CI pipeline actually builds, pushes, and gets picked up by Watchtower.
// Safe to delete once verified - not referenced by the app.
Deno.serve(() => {
  return new Response(
    JSON.stringify({ ok: true, marker: "pipeline-test-v1" }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// Netlify Scheduled Function — triggers a daily rebuild
// This runs on a cron schedule defined in netlify.toml
// Each run triggers a new deploy, which re-runs the build command (fetching fresh data)

export default async () => {
  console.log("Scheduled rebuild triggered at", new Date().toISOString());

  const buildHookUrl = process.env.BUILD_HOOK_URL;
  if (!buildHookUrl) {
    console.log("BUILD_HOOK_URL not set. Skipping rebuild trigger.");
    return new Response("No build hook configured", { status: 200 });
  }

  const res = await fetch(buildHookUrl, { method: "POST" });
  console.log(`Build hook response: ${res.status}`);
  return new Response(`Rebuild triggered: ${res.status}`, { status: 200 });
};

export const config = {
  schedule: "0 6 * * *", // Every day at 6:00 AM UTC
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureDbReady } = await import("./db");
      await ensureDbReady();
      const { ensureSeeded } = await import("./db/seed");
      // Fire-and-forget; the login route also awaits this promise so a fresh
      // desktop database still has the demo admin account before first sign-in.
      await ensureSeeded();
    } catch (e) {
      console.error("Startup database/seed check failed:", e);
    }
  }
}

import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Bu uygulama yalnızca Lakebase Postgres kullanır:
  // - Kimlik doğrulama: uygulamaya özel JWT auth (lib/auth-server.ts) — Neon Auth gerekmiyor
  // - AI Gateway: Free planda kullanılamıyor; kaldırıldı
  // - Functions/Realtime: henüz ihtiyaç yok; gerektiğinde eklenecek
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});

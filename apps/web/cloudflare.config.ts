import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  // Worker oficial separado do ambiente de prévia. A publicação do domínio ocorre somente após testes de inscrição e segurança.
  accountId: "8fe5407b4d31f20e19a1388527e365ad",
  worker: defineWorker({
    name: "educart-production",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-31",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
    },
  }),
});

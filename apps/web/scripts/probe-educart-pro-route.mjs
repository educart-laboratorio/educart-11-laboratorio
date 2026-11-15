// Somente leitura: identifica como educart.pro está conectado na Cloudflare.
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = "8fe5407b4d31f20e19a1388527e365ad";
if (!TOKEN || process.env.GITHUB_REPOSITORY !== "educart-laboratorio/educart-11-laboratorio") {
  throw new Error("Execução não autorizada");
}
async function api(path) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    headers: { Authorization: "Bearer " + TOKEN }
  });
  const data = await response.json().catch(() => ({}));
  const errors = Array.isArray(data.errors) ? data.errors.map(x => x.code + ":" + x.message).join(";") : "";
  console.log("GET " + path.split("?")[0] + " status=" + response.status +
              " success=" + (data.success === true) + (errors ? " error=" + errors : ""));
  return response.ok && data.success ? data.result : null;
}
const zones = await api("/zones?name=educart.pro&account.id=" + ACCOUNT);
if (Array.isArray(zones)) {
  const zone = zones.find(x => x.name === "educart.pro");
  console.log("Zone identificada=" + Boolean(zone));
  if (zone?.id) {
    const routes = await api("/zones/" + zone.id + "/workers/routes");
    if (Array.isArray(routes)) {
      for (const route of routes.filter(r => /educart\\.pro/.test(r.pattern || ""))) {
        console.log("ROTA " + route.pattern + " -> " + route.script + " (id=" + route.id + ")");
      }
    }
  }
}
const prod = await api("/accounts/" + ACCOUNT + "/workers/scripts/educart-production/settings");
if (prod && Array.isArray(prod.bindings)) {
  console.log("Worker production bindings (nomes/tipos somente): " +
              prod.bindings.map(x => x.name + ":" + x.type).join(", "));
}

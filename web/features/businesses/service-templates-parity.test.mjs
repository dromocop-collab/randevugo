import test from "node:test";
import assert from "node:assert/strict";
import * as web from "./service-templates.ts";
import * as server from "../../../functions/src/starter-services-domain.ts";

// WhatsApp'tan kayıt sunucuda hazır hizmet açar; web sihirbazıyla aynı şablonları kullanmalı.
test("hazır hizmet şablonları web ve sunucuda birebir aynı", () => {
  assert.deepEqual(server.STARTER_SERVICE_TEMPLATES, web.STARTER_SERVICE_TEMPLATES);
  for (const category of ["kuafor", "berber", "diger", "pilates", "yok-boyle"]) {
    assert.deepEqual(
      server.buildStarterServicePlan(category, server.defaultStarterSelections(category)),
      web.buildStarterServicePlan(category, web.defaultStarterSelections(category)),
      category,
    );
  }
});

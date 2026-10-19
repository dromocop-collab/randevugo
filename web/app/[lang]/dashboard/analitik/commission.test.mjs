import test from "node:test";
import assert from "node:assert/strict";
import { buildCommissionReport, commissionCsv } from "./commission.ts";

const now = Date.UTC(2026, 9, 13, 12);
const day = 86_400_000;
const at = (offsetDays) => new Date(now - offsetDays * day).toISOString();

test("prim yalnız tamamlanan ve dönem içindeki randevulardan hesaplanır", () => {
  const appointments = [
    { staffId: "a", status: "completed", startAt: at(1), servicePrice: 500 },
    { staffId: "a", status: "completed", startAt: at(40), servicePrice: 300 },
    { staffId: "a", status: "cancelled", startAt: at(2), servicePrice: 999 },
    { staffId: "b", status: "completed", startAt: at(3), servicePrice: 200 },
  ];
  const staff = [
    { id: "a", fullName: "Ayşe", commissionRate: 40, commissionPayouts: [{ amount: 100 }] },
    { id: "b", fullName: "Bora", commissionRate: 150 },
    { id: "c", fullName: "Cem", commissionRate: 0 },
  ];
  const { rows, totals } = buildCommissionReport(appointments, staff, 30, now);
  // Prim eşit (200) → ciroya göre sıralanır.
  assert.deepEqual(rows.map((r) => r.name), ["Ayşe", "Bora"]);
  const ayse = rows.find((r) => r.name === "Ayşe");
  assert.equal(ayse.completed, 1);
  assert.equal(ayse.revenue, 500);
  assert.equal(ayse.earned, 200);
  // tüm zamanlar: (500+300)*0.4 = 320 − 100 ödenen
  assert.equal(ayse.outstanding, 220);
  assert.equal(rows.find((r) => r.name === "Bora").rate, 100);
  assert.deepEqual(totals, { revenue: 700, earned: 400, outstanding: 420 });
});

test("CSV Excel için BOM ve noktalı virgül kullanır", () => {
  const csv = commissionCsv([{ staffId: "a", name: "Ayşe; Yılmaz", rate: 40, completed: 2, revenue: 1250.5, earned: 500.2, outstanding: 0 }], "Son 30 gün");
  assert.ok(csv.startsWith("﻿"));
  assert.match(csv, /"Ayşe; Yılmaz"/);
  assert.match(csv, /1\.250,5/);
});

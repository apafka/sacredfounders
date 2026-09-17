import assert from "node:assert/strict";
import test from "node:test";
import { RESPAWN_MS } from "../combat";
import { encounterReadyToRevive, freshEncounters, reviveTimedEncounters } from "./wilderness";

test("a single corpse returns after 30s without waiting for a full wipe", () => {
  const start = freshEncounters();
  const killed = start.map((item, index) =>
    index === 0 ? { ...item, alive: false, hp: 0, lootDropped: true, diedAt: 10 } : item,
  );
  assert.equal(encounterReadyToRevive(killed[0], 10 + 1_000), false);
  const tooSoon = reviveTimedEncounters(killed, 10 + 1_000);
  assert.deepEqual(tooSoon.revived, []);
  const ready = reviveTimedEncounters(killed, 10 + RESPAWN_MS);
  assert.deepEqual(ready.revived, [killed[0].id]);
  assert.equal(ready.encounters[0].alive, true);
  assert.equal(ready.encounters[1].alive, true);
});

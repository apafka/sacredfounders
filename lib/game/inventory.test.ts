import assert from "node:assert/strict";
import test from "node:test";
import { addItem, countItem, emptyInventory, removeItem } from "./inventory";

test("inventory stacks wheat and refuses a 21st unique pile", () => {
  let slots = addItem(emptyInventory(), "wheat_seed", 3);
  assert.ok(slots);
  assert.equal(countItem(slots, "wheat_seed"), 3);
  slots = addItem(slots, "wheat", 2);
  assert.ok(slots);
  slots = addItem(slots, "health_potion", 2);
  assert.ok(slots);
  assert.equal(countItem(slots, "health_potion"), 2);
  slots = removeItem(slots, "wheat", 1);
  assert.ok(slots);
  assert.equal(countItem(slots, "wheat"), 1);
  assert.equal(removeItem(slots, "wheat", 5), null);
});

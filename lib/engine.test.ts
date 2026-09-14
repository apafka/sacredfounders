import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseClass,
  createPlayer,
  gather,
  mintItem,
  moveTo,
} from "./engine";
import { tileAt } from "./world";

test("class pick persists on the player", () => {
  const pilgrim = createPlayer("p1", "Alan", 1);
  assert.equal(pilgrim.classId, null);
  const sworn = chooseClass(pilgrim, "fighter", 2);
  assert.equal(sworn.ok, true);
  assert.equal(sworn.player.classId, "fighter");
  assert.equal(chooseClass(sworn.player, "seeker", 3).ok, false);
});

test("economy gather depends on class tiles", () => {
  let player = chooseClass(createPlayer("p2", "Seeker", 1), "seeker", 2).player;
  // grove at 3,1
  player = moveTo(player, 4, 2, 3).player;
  player = moveTo(player, 4, 1, 4).player;
  player = moveTo(player, 3, 1, 5).player;
  assert.equal(tileAt(player.x, player.y), "grove");
  const got = gather(player, () => 0, 1000);
  assert.equal(got.ok, true);
  assert.ok(got.player.inventory.moonpetal + got.player.inventory.ashwood >= 1);
});

test("seal moves an item into relics", () => {
  let player = chooseClass(createPlayer("p3", "Fighter", 1), "fighter", 2).player;
  player = { ...player, inventory: { ...player.inventory, "ember-scale": 1 } };
  const sealed = mintItem(player, "ember-scale", {
    status: "ledger",
    chain: "sanctuary-ledger",
    tokenId: "1-1",
  }, 3);
  assert.equal(sealed.ok, true);
  assert.equal(sealed.player.inventory["ember-scale"], 0);
  assert.equal(sealed.player.relics[0]?.itemId, "ember-scale");
});

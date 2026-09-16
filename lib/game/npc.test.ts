import assert from "node:assert/strict";
import test from "node:test";
import { DeterministicBrain } from "./npc";

const brain = new DeterministicBrain();

test("Bren asks for three loaves when the shelf is empty", () => {
  const intent = brain.decide({
    wheat: 0,
    bread: 0,
    root: 0,
    herb: 0,
    demand: { kind: "bread", qty: 3, fulfilledAt: null },
  });
  assert.equal(intent.type, "demand");
  if (intent.type !== "demand") return;
  assert.equal(intent.itemId, "bread");
  assert.equal(intent.qty, 3);
  assert.equal(intent.ready, false);
  assert.match(intent.line, /three loaves/i);
});

test("Bren accepts loaves when the pilgrim is carrying enough", () => {
  const intent = brain.decide({
    wheat: 0,
    bread: 3,
    root: 0,
    herb: 0,
    demand: { kind: "bread", qty: 3, fulfilledAt: null },
  });
  assert.equal(intent.type, "demand");
  if (intent.type !== "demand") return;
  assert.equal(intent.ready, true);
  assert.match(intent.line, /loaves will do/i);
});

test("Bren asks for grain after a bread demand is gone", () => {
  const intent = brain.decide({
    wheat: 1,
    bread: 0,
    root: 0,
    herb: 0,
    demand: { kind: "grain", qty: 3, fulfilledAt: null },
  });
  assert.equal(intent.type, "demand");
  if (intent.type !== "demand") return;
  assert.equal(intent.itemId, "wheat");
  assert.equal(intent.ready, false);
  assert.match(intent.line, /grain/i);
});

test("without an open demand Bren still buys wheat", () => {
  const intent = brain.decide({
    wheat: 2,
    bread: 0,
    root: 0,
    herb: 0,
    demand: { kind: "bread", qty: 3, fulfilledAt: 99 },
  });
  assert.equal(intent.type, "offer-buy");
  if (intent.type !== "offer-buy") return;
  assert.equal(intent.qty, 2);
  assert.equal(intent.price, 2);
});

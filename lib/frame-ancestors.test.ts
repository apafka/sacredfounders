import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import nextConfig, { FRAME_ANCESTORS_CSP } from "../next.config";

test("CSP allows only self and alanpafka.com to embed", async () => {
  assert.equal(
    FRAME_ANCESTORS_CSP,
    "frame-ancestors 'self' https://alanpafka.com https://www.alanpafka.com;",
  );
  const rows = await nextConfig.headers?.();
  const headers = rows?.flatMap((row) => row.headers) ?? [];
  const csp = headers.find((header) => header.key === "Content-Security-Policy")?.value;
  assert.equal(csp, FRAME_ANCESTORS_CSP);
  assert.equal(
    headers.some((header) => header.key.toLowerCase() === "x-frame-options"),
    false,
  );
});

test("vercel.json matches the same frame-ancestors policy and keeps nosniff", () => {
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
    headers: { headers: { key: string; value: string }[] }[];
  };
  const headers = vercel.headers.flatMap((row) => row.headers);
  assert.equal(
    headers.find((header) => header.key === "Content-Security-Policy")?.value,
    FRAME_ANCESTORS_CSP,
  );
  assert.equal(headers.find((header) => header.key === "X-Content-Type-Options")?.value, "nosniff");
  assert.equal(
    headers.some((header) => header.key.toLowerCase() === "x-frame-options"),
    false,
  );
});

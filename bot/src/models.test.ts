import assert from "node:assert/strict";
import test from "node:test";
import { GEMINI_TEXT_MODELS, GROQ_CHAT_MODELS, modelChain } from "./models.js";

test("model pertama tidak diulang di sisa rantai", () => {
  const chain = modelChain("gemini-3.8-flash", GEMINI_TEXT_MODELS);
  assert.equal(chain[0], "gemini-3.8-flash");
  assert.equal(chain.filter((model) => model === "gemini-3.8-flash").length, 1);
  assert.equal(chain.length, GEMINI_TEXT_MODELS.length);
});

test("model env yang tidak ada di daftar tetap dicoba lebih dulu", () => {
  const chain = modelChain("gemini-2.0-flash", GEMINI_TEXT_MODELS);
  assert.equal(chain[0], "gemini-2.0-flash");
  assert.equal(chain[1], "gemini-2.5-flash");
});

test("rantai Groq memakai model chat", () => {
  const chain = modelChain("openai/gpt-oss-20b", GROQ_CHAT_MODELS);
  assert.deepEqual(chain, [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-safeguard-20b",
    "qwen/qwen3.8-27b",
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseAnalysisContent } from "./analysis-format.ts";

test("accepts Qwythos JSON wrapped in a Markdown fence without weakening schema validation", () => {
  const parsed = parseAnalysisContent('```json\n{"verdict":"suspected","failure_type":"spaghetti","failure_probability":0.7,"progress_percent":42,"completed":false,"summary":"노즐 주변에 가는 필라멘트가 보입니다."}\n```');
  assert.equal(parsed.failure_type, "spaghetti");
  assert.equal(parsed.failure_probability, 0.7);
});

test("normalizes the two observed Qwythos aliases and rejects no other schema values", () => {
  const parsed = parseAnalysisContent('{"verdict":"ongoing","failure_type":null,"failure_probability":0.05,"progress_percent":41,"completed":false,"summary":"인쇄는 진행 중이며 결함이 없습니다."}');
  assert.equal(parsed.verdict, "normal");
  assert.equal(parsed.failure_type, "none");
  assert.throws(() => parseAnalysisContent('{"verdict":"fine","failure_type":null,"failure_probability":0.05,"progress_percent":41,"completed":false,"summary":"정상"}'));
});

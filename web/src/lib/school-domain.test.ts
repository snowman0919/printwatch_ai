import assert from "node:assert/strict";
import test from "node:test";
import { isSchoolEmail } from "./school-domain.ts";

test("accepts only the exact DIMIGO mail domain", () => {
  assert.equal(isSchoolEmail("student@dimigo.hs.kr"), true);
  assert.equal(isSchoolEmail("student@sub.dimigo.hs.kr"), false);
  assert.equal(isSchoolEmail("student@dimigo.hs.kr.attacker.example"), false);
});

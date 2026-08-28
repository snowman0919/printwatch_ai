import assert from "node:assert/strict";
import test from "node:test";
import { hasVerifiedSchoolGoogleAccount, isSchoolEmail } from "./school-domain.ts";

test("accepts only the exact DIMIGO mail domain", () => {
  assert.equal(isSchoolEmail("student@dimigo.hs.kr"), true);
  assert.equal(isSchoolEmail("student@sub.dimigo.hs.kr"), false);
  assert.equal(isSchoolEmail("student@dimigo.hs.kr.attacker.example"), false);
});

test("requires a verified Google account for the same school address", () => {
  const verifiedGoogle = [{ provider: "oauth_google", emailAddress: "student@dimigo.hs.kr", verification: { status: "verified" } }];
  assert.equal(hasVerifiedSchoolGoogleAccount("student@dimigo.hs.kr", verifiedGoogle), true);
  assert.equal(hasVerifiedSchoolGoogleAccount("other@dimigo.hs.kr", verifiedGoogle), false);
  assert.equal(hasVerifiedSchoolGoogleAccount("student@dimigo.hs.kr", [{ ...verifiedGoogle[0], provider: "microsoft" }]), false);
  assert.equal(hasVerifiedSchoolGoogleAccount("student@dimigo.hs.kr", [{ ...verifiedGoogle[0], verification: { status: "unverified" } }]), false);
});

import { test } from "node:test"
import assert from "node:assert/strict"
import { escapeHtml } from "./html-escape.ts"

test("escapeHtml neutralises every significant character", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script> & 'q'`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;",
  )
})

test("escapeHtml tolerates non-strings", () => {
  assert.equal(escapeHtml(null), "")
  assert.equal(escapeHtml(undefined), "")
  assert.equal(escapeHtml(12), "12")
  assert.equal(escapeHtml(true), "true")
})

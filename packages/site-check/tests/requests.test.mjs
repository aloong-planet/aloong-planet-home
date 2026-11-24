// Which blocked requests change what is measured. The check aborts every request that does not go to the local
// server, so an aborted request of one of these types means the page was measured without something that sets its
// width (app-sites::QR-001/AC-01).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { affectsLayout } from '../src/requests.mjs'

const types = [
  ['stylesheet', true],
  ['font', true],
  ['image', true],
  ['media', true],
  ['script', false],
  ['fetch', false],
  ['xhr', false],
  ['document', false],
  ['websocket', false],
  ['ping', false],
]
for (const [type, expected] of types) {
  test(`an aborted ${type} request ${expected ? 'changes' : 'does not change'} what is measured`, () => {
    assert.equal(affectsLayout(type), expected)
  })
}

import assert from 'node:assert/strict'
import { createInitialGame, getConvertedCount, runTurn } from '../src/game/engine.ts'

const first = runTurn(createInitialGame(6011), 'lin', 'dialogue')
const second = runTurn(createInitialGame(6011), 'lin', 'dialogue')
assert.equal(first.stakeholders.lin.support, second.stakeholders.lin.support)
assert.equal(first.rngSeed, second.rngSeed)
assert.equal(first.resources, 56)
assert.throws(() => runTurn(createInitialGame(6011), 'chen', 'pilot'), /需要先达到/)

let game = createInitialGame(6011)
const winningPath = [
  ['lin', 'workshop'],
  ['lin', 'pilot'],
  ['han', 'endorsement'],
  ['zhou', 'endorsement'],
  ['zhou', 'endorsement'],
  ['sun', 'endorsement'],
  ['sun', 'endorsement'],
]
for (const [person, action] of winningPath) game = runTurn(game, person, action)
assert.equal(game.status, 'won')
assert.equal(getConvertedCount(game), 4)
assert.equal(game.history.length, 7)
assert.equal(game.resources, 10)
console.log(JSON.stringify({ result: 'passed', deterministic: true, prerequisiteGuard: true, winningTurns: game.history.length, allies: getConvertedCount(game), remainingResources: game.resources }, null, 2))

import assert from "assert";

import {
  canCapture,
  canMovePiece,
  getMovablePieces,
  getNextPiecePosition,
} from "../src/game/ludo/LudoRules.js";
import { LudoGame } from "../src/game/ludo/LudoGame.js";
import { LudoState } from "../src/rooms/ludo/schema/LudoState.js";
import { LudoPiece } from "../src/rooms/ludo/schema/LudoPiece.js";
import { LudoPlayer } from "../src/rooms/ludo/schema/LudoPlayer.js";

function createPiece(id: string, position: number, status: string = "home") {
  const piece = new LudoPiece();
  piece.id = id;
  piece.position = position;
  piece.status = status;
  return piece;
}

describe("Ludo rules", () => {
  it("allows leaving home only with a 6 and prevents moves beyond the finish", () => {
    const homePiece = createPiece("p1", -1, "home");
    assert.strictEqual(canMovePiece(homePiece, 6, "red"), true);
    assert.strictEqual(canMovePiece(homePiece, 5, "red"), false);

    const finishedPiece = createPiece("p2", 58, "finished");
    assert.strictEqual(canMovePiece(finishedPiece, 1, "red"), false);

    const nearFinish = createPiece("p3", 55, "active");
    assert.strictEqual(canMovePiece(nearFinish, 3, "red"), true);
    assert.strictEqual(canMovePiece(nearFinish, 4, "red"), false);
  });

  it("blocks invalid moves in the final corridor and computes the next exact position", () => {
    const corridorPiece = createPiece("p4", 52, "active");
    assert.strictEqual(canMovePiece(corridorPiece, 1, "red"), true);
    assert.strictEqual(getNextPiecePosition(corridorPiece, 1, "red"), 53);

    const almostFinished = createPiece("p5", 57, "active");
    assert.strictEqual(canMovePiece(almostFinished, 1, "red"), true);
    assert.strictEqual(getNextPiecePosition(almostFinished, 1, "red"), 58);

    const tooFar = createPiece("p6", 57, "active");
    assert.strictEqual(canMovePiece(tooFar, 2, "red"), false);
  });

  it("only returns pieces that can really move and blocks captures on safe cells", () => {
    const player = new LudoPlayer();
    player.color = "red";
    player.pieces.set("home", createPiece("home", -1, "home"));
    player.pieces.set("safe", createPiece("safe", 0, "active"));
    player.pieces.set("move", createPiece("move", 10, "active"));
    player.pieces.set("stuck", createPiece("stuck", 57, "active"));

    assert.deepStrictEqual(getMovablePieces(player, 6), ["safe", "move"]);
    assert.deepStrictEqual(getMovablePieces(player, 5), ["safe", "move"]);

    const safeAttacker = createPiece("safeAttacker", 0, "active");
    const safeTarget = createPiece("safeTarget", 39, "active");
    assert.strictEqual(canCapture(safeAttacker, "red", safeTarget, "blue"), false);

    const unsafeAttacker = createPiece("unsafeAttacker", 3, "active");
    const unsafeTarget = createPiece("unsafeTarget", 42, "active");
    assert.strictEqual(canCapture(unsafeAttacker, "red", unsafeTarget, "blue"), true);
  });

  it("passes the turn when no piece can move and sets the next player", () => {
    const state = new LudoState();
    const player1 = new LudoPlayer();
    player1.sessionId = "p1";
    player1.color = "red";
    player1.pieces.set("a", createPiece("a", -1, "home"));

    const player2 = new LudoPlayer();
    player2.sessionId = "p2";
    player2.color = "blue";
    player2.pieces.set("b", createPiece("b", -1, "home"));

    state.players.set("p1", player1);
    state.players.set("p2", player2);
    state.status = "playing";
    state.currentPlayerId = "p1";

    const game = new LudoGame(state);
    const result = game.rollDice("p1");

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.turnPassed, true);
    assert.strictEqual(state.currentPlayerId, "p2");
    assert.strictEqual(state.status, "playing");
  });

  it("finishes the game and stores the winner when the last piece reaches the end", () => {
    const state = new LudoState();
    const player1 = new LudoPlayer();
    player1.sessionId = "p1";
    player1.color = "red";
    player1.pieces.set("p1-a", createPiece("p1-a", 57, "active"));
    player1.pieces.set("p1-b", createPiece("p1-b", 58, "finished"));
    player1.pieces.set("p1-c", createPiece("p1-c", 58, "finished"));
    player1.pieces.set("p1-d", createPiece("p1-d", 58, "finished"));

    const player2 = new LudoPlayer();
    player2.sessionId = "p2";
    player2.color = "blue";
    player2.pieces.set("p2-a", createPiece("p2-a", -1, "home"));
    player2.pieces.set("p2-b", createPiece("p2-b", -1, "home"));
    player2.pieces.set("p2-c", createPiece("p2-c", -1, "home"));
    player2.pieces.set("p2-d", createPiece("p2-d", -1, "home"));

    state.players.set("p1", player1);
    state.players.set("p2", player2);
    state.status = "playing";
    state.currentPlayerId = "p1";
    state.diceRolled = true;
    state.diceValue = 1;

    const game = new LudoGame(state);
    const result = game.movePiece("p1", "p1-a");

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.winner, true);
    assert.strictEqual(state.status, "finished");
    assert.strictEqual(state.winnerId, "p1");
  });
});

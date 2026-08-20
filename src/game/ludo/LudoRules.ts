import {
    MAIN_TRACK_LENGTH,
    HOME_POSITION,
    FINISH_POSITION,
    MAX_PIECES_PER_SAFE_SQUARE,
    PlayerColor,
    getStartPosition,
    isSafePosition,
    getGlobalPosition,
    isMainTrackPosition,
} from "./LudoBoard.js"
import { LudoPlayer } from "../../rooms/ludo/schema/LudoPlayer.js";
import { LudoPiece } from "../../rooms/ludo/schema/LudoPiece.js";

export function canLeaveHome(
    diceValue: number
): boolean {
    return diceValue === 6;
}

function isSameColorPositionBlocked(
    player: LudoPlayer | undefined,
    movedPiece: LudoPiece,
    destination: number
): boolean {
    if (!player) {
        return false;
    }

    if (destination < 0 || destination >= MAIN_TRACK_LENGTH) {
        return false;
    }

    let occupantsCount = 0;

    for (const piece of player.pieces.values()) {
        if (piece.id === movedPiece.id) {
            continue;
        }

        if (
            piece.position >= 0 &&
            piece.position < MAIN_TRACK_LENGTH &&
            piece.position === destination
        ) {
            occupantsCount++;
        }
    }

    if (occupantsCount === 0) {
        return false;
    }

    const globalDestination = getGlobalPosition(
        player.color,
        destination
    );

    const destinationIsSafe =
        globalDestination !== null &&
        isSafePosition(globalDestination);

    if (destinationIsSafe) {
        // 🛡️ Sur une case sûre, plusieurs pions du même joueur
        // peuvent cohabiter (jusqu'à MAX_PIECES_PER_SAFE_SQUARE)
        // pour former un bloc.
        return occupantsCount >= MAX_PIECES_PER_SAFE_SQUARE;
    }

    // Hors case sûre, un seul pion du joueur peut occuper la case.
    return true;
}

export function canMovePiece(
    piece: LudoPiece,
    diceValue: number,
    playerOrColor?: LudoPlayer | PlayerColor
): boolean {
    if (diceValue < 1 || diceValue > 6) {
        return false;
    }

    if (piece.position === FINISH_POSITION) {
        return false;
    }

    const player =
        typeof playerOrColor === "string"
            ? undefined
            : playerOrColor;

    if (piece.position === HOME_POSITION) {
        if (diceValue !== 6) {
            return false;
        }

        return !isSameColorPositionBlocked(player, piece, 0);
    }

    const nextPosition = piece.position + diceValue;

    if (nextPosition > FINISH_POSITION) {
        return false;
    }

    return !isSameColorPositionBlocked(player, piece, nextPosition);
}

export function getMovablePieces(
    player: LudoPlayer,
    diceValue: number
): string[] {
    const movablesPieces: string[] = [];

    player.pieces.forEach((piece) => {
        if (canMovePiece(piece, diceValue, player)) {
            movablesPieces.push(piece.id);
        }
    });

    return movablesPieces;
}

export function getNextPiecePosition(
  piece: LudoPiece,
  diceValue: number,
  playerColor?: PlayerColor,
  player?: LudoPlayer
): number | null {
  if (!canMovePiece(piece, diceValue, player ?? playerColor)) {
    return null;
  }

  if (piece.position === HOME_POSITION) {
    return 0;
  }

  return piece.position + diceValue;
}

export function canCapture(
    attacker: LudoPiece,
    attackerColor: PlayerColor,
    target: LudoPiece,
    targetColor: PlayerColor
): boolean {
    if (
        attacker.position === HOME_POSITION ||
        target.position === HOME_POSITION
    ) {
        return false;
    }

    if (
        attacker.position === FINISH_POSITION ||
        target.position === FINISH_POSITION
    ) {
        return false;
    }

    if (
        !isMainTrackPosition(attacker.position) ||
        !isMainTrackPosition(target.position)
    ) {
        return false;
    }

    const attackerGlobal =
        getGlobalPosition(
            attackerColor,
            attacker.position
        );

    const targetGlobal =
        getGlobalPosition(
            targetColor,
            target.position
        );

    if (
        attackerGlobal === null ||
        targetGlobal === null
    ) {
        return false;
    }

    if (
        attackerGlobal !== targetGlobal
    ) {
        return false;
    }

    if (
        isSafePosition(attackerGlobal)
    ) {
        return false;
    }

    return true;
}

export function hasPlayerWon(
  player: LudoPlayer
): boolean {
  for (
    const piece
    of player.pieces.values()
  ) {
    if (piece.position !== FINISH_POSITION) {
      return false;
    }
  }

  return true;
}
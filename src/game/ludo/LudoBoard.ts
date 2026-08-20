export const MAIN_TRACK_LENGTH = 52;
export const FINAL_PATH_LENGTH = 5;
export const HOME_POSITION = -1;

export const START_POSITION = 0;
export const FINISH_POSITION = MAIN_TRACK_LENGTH + FINAL_PATH_LENGTH;

export type PlayerColor = 
    | "red"
    | "blue"
    | "green"
    | "yellow";


export const PLAYER_START_POSITIONS: Record<
    PlayerColor, 
    number
> = {
    red: 0,
    blue: 13,
    green: 26,
    yellow: 39
}


export const SAFE_POSITIONS = new Set<number>([
  0,
  8,
  13,
  21,
  26,
  34,
  39,
  47,
]);

/**
 * Nombre maximum de pions d'un même joueur pouvant cohabiter
 * sur une case sûre (règle du "bloc"). Ailleurs sur la piste,
 * un seul pion du joueur peut occuper une case à la fois.
 */
export const MAX_PIECES_PER_SAFE_SQUARE = 4;


export function getStartPosition(
    color: PlayerColor
): number {
    return PLAYER_START_POSITIONS[color];
}


export function getNextTrackPosition(
  currentPosition: number,
  steps: number
): number {
  return (
    (currentPosition + steps) %
    MAIN_TRACK_LENGTH
  );
}

/**
 * Convertit une position relative du joueur
 * en position globale sur la piste commune.
 *
 * Retourne null si le pion est dans le
 * couloir final ou terminé.
 */
export function getGlobalPosition(
  color: PlayerColor,
  relativePosition: number
): number | null {
  if (
    relativePosition < 0 ||
    relativePosition >= MAIN_TRACK_LENGTH
  ) {
    return null;
  }

  const startPosition =
    getStartPosition(color);

  return (
    (startPosition + relativePosition) %
    MAIN_TRACK_LENGTH
  );
}

export function isMainTrackPosition(
  position: number
): boolean {
  return (
    position >= 0 &&
    position < MAIN_TRACK_LENGTH
  );
}

export function isFinalPathPosition(
  position: number
): boolean {
  return (
    position >= MAIN_TRACK_LENGTH &&
    position < FINISH_POSITION
  );
}

export function isFinishedPosition(
  position: number
): boolean {
  return position === FINISH_POSITION;
}

export function isSafePosition(
  globalPosition: number
): boolean {
  return SAFE_POSITIONS.has(
    globalPosition
  );
}
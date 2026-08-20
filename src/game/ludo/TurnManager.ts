import { LudoState } from "../../rooms/ludo/schema/LudoState.js";

export class TurnManager {
    constructor(
        private readonly state: LudoState
    ) { }

    getCurrentPlayer() {
        if (!this.state.currentPlayerId) {
            return undefined;
        }

        return this.state.players.get(
            this.state.currentPlayerId
        );
    }

    getPlayers() {
        return Array.from(
            this.state.players.values()
        );
    }

    startFirstTurn() {
        const players = this.getPlayers();

        if (players.length === 0) {
            return;
        }

        this.state.currentPlayerId =
            players[0].sessionId;

        this.state.turnNumber = 1;
        this.state.diceValue = 0;

        this.state.diceRolled = false;

        this.state.moveMade = false;
    }

    nextTurn() {
        const players = this.getPlayers();

        if (players.length === 0) {
            return;
        }

        const currentIndex = players.findIndex(
            (player) =>
                player.sessionId ===
                this.state.currentPlayerId
        );

        if (currentIndex === -1) {
            this.startFirstTurn();
            return;
        }

        const nextIndex =
            (currentIndex + 1) %
            players.length;

        this.state.currentPlayerId =
            players[nextIndex].sessionId;

        this.state.turnNumber++;

        this.state.diceValue = 0;
        this.state.diceRolled = false;
        this.state.moveMade = false;
    }

    isPlayerTurn(sessionId: string) {
        return (
            this.state.currentPlayerId ===
            sessionId
        );
    }

    shouldKeepTurn(
        diceValue: number
    ): boolean {
        return diceValue === 6;
    }
}
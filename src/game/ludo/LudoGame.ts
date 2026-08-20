import { LudoState } from "../../rooms/ludo/schema/LudoState.js";

import { TurnManager } from "./TurnManager.js";

import { Dice } from "./Dice.js";

import {
    getMovablePieces,
    getNextPiecePosition,
    canCapture,
    hasPlayerWon,
} from "./LudoRules.js";

import { LudoPlayer } from "../../rooms/ludo/schema/LudoPlayer.js";

import { LudoPiece } from "../../rooms/ludo/schema/LudoPiece.js";

import {
    HOME_POSITION,
    FINISH_POSITION,
} from "./LudoBoard.js";

export class LudoGame {
    private readonly turnManager: TurnManager;

    constructor(
        private readonly state: LudoState
    ) {
        this.turnManager =
            new TurnManager(state);
    }

    private updateRankings() {
        const players = Array.from(
            this.state.players.values()
        );

        const ranking = players
            .map((player) => {
                const finished = Array.from(
                    player.pieces.values()
                ).filter((piece) => piece.position === FINISH_POSITION).length;

                const remaining = Array.from(
                    player.pieces.values()
                ).filter((piece) => piece.position !== FINISH_POSITION).length;

                return {
                    sessionId: player.sessionId,
                    finished,
                    remaining,
                };
            })
            .sort((a, b) => {
                if (b.finished !== a.finished) {
                    return b.finished - a.finished;
                }

                return a.remaining - b.remaining;
            })
            .map((entry) => entry.sessionId);

        this.state.rankings = ranking;
    }

    start() {
        if (this.state.players.size < 2) {
            return false;
        }

        const players = Array.from(
            this.state.players.values()
        );

        const allReady = players.every(
            (player) => player.ready
        );

        if (!allReady) {
            console.log(
            "⏳ Waiting for all players to be ready..."
        );
            return false;
        }

        this.state.status = "playing";
        this.state.winnerId = "";
        this.state.rankings = [];

        this.state.diceValue = 0;

        this.state.diceRolled = false;

        this.state.moveMade = false;

        this.turnManager.startFirstTurn();

        console.log("🎮 Game Started!");

        console.log(
            "🎯 First player:",
            this.state.currentPlayerId
        );

        return true;
    }

    getTurnManager() {
        return this.turnManager;
    }

    rollDice(sessionId: string) {
        if (
            this.state.status !== "playing"
        ) {
            return {
                success: false,
                reason: "GAME_NOT_STARTED",
            };
        }

        if (
            !this.turnManager.isPlayerTurn(
                sessionId
            )
        ) {
            return {
                success: false,
                reason: "NOT_YOUR_TURN",
            };
        }

        if (this.state.diceRolled) {
            return {
                success: false,
                reason: "DICE_ALREADY_ROLLED",
            };
        }

        const player =
            this.state.players.get(
                sessionId
            );

        if (!player) {
            return {
                success: false,
                reason: "PLAYER_NOT_FOUND",
            };
        }

        // 🎲 Lancer le dé
        const value = Dice.roll();

        this.state.diceValue =
            value;

        this.state.diceRolled =
            true;

        this.state.moveMade =
            false;

        // 🔎 Chercher les pions jouables
        const movablePieces =
            getMovablePieces(
                player,
                value
            );

        console.log(
            `🎲 ${player.name} rolled ${value}`
        );

        console.log(
            "Movable pieces:",
            movablePieces
        );

        // =====================================
        // Aucun pion ne peut jouer
        // =====================================

        if (
            movablePieces.length === 0
        ) {
            console.log(
                `🚫 ${player.name} cannot move`
            );

            // Réinitialiser le dé
            this.state.diceValue =
                0;

            this.state.diceRolled =
                false;

           this.passTurn();

            console.log(
                "➡️ Turn passed"
            );

            return {
                success: true,
                value,
                movablePieces: [],
                turnPassed: true,
            };
        }

        // =====================================
        // Au moins un pion peut jouer
        // =====================================

        return {
            success: true,
            value,
            movablePieces,
            turnPassed: false,
        };
    }

    getMovablePieces(
        sessionId: string
    ) {
        if (
            this.state.status !== "playing"
        ) {
            return [];
        }

        if (
            !this.turnManager.isPlayerTurn(
                sessionId
            )
        ) {
            return [];
        }

        if (!this.state.diceRolled) {
            return [];
        }

        if (this.state.moveMade) {
            return [];
        }

        const player =
            this.state.players.get(
                sessionId
            );

        if (!player) {
            return [];
        }

        return getMovablePieces(
            player,
            this.state.diceValue
        );
    }

    private captureOpponents(
    player: LudoPlayer,
    movedPiece: LudoPiece
) {

    for (
        const opponent
        of this.state.players.values()
    ) {

        // Ignorer le joueur lui-même
        if (
            opponent.sessionId ===
            player.sessionId
        ) {
            continue;
        }

        for (
            const opponentPiece
            of opponent.pieces.values()
        ) {

            if (
                !canCapture(
                    movedPiece,
                    player.color,
                    opponentPiece,
                    opponent.color
                )
            ) {
                continue;
            }

            // Capture
            opponentPiece.position =
                HOME_POSITION;

            opponentPiece.status =
                "home";

            console.log(
                `💥 ${player.name} captured ` +
                `${opponent.name}'s ${opponentPiece.id}`
            );
        }
    }
}

    private passTurn() {
        this.turnManager.nextTurn();

        console.log(
            "➡️ Turn passed. Next player:",
            this.state.currentPlayerId
        );
    }

    movePiece(
        sessionId: string,
        pieceId: string
    ) {
        // =========================
        // GAME CHECK
        // =========================

        if (
            this.state.status !== "playing"
        ) {
            return {
                success: false,
                reason: "GAME_NOT_STARTED",
            };
        }


        // =========================
        // TURN CHECK
        // =========================

        if (
            !this.turnManager.isPlayerTurn(
                sessionId
            )
        ) {
            return {
                success: false,
                reason: "NOT_YOUR_TURN",
            };
        }


        // =========================
        // DICE CHECK
        // =========================

        if (!this.state.diceRolled) {
            return {
                success: false,
                reason: "DICE_NOT_ROLLED",
            };
        }


        // =========================
        // MOVE ALREADY MADE
        // =========================

        if (this.state.moveMade) {
            return {
                success: false,
                reason: "MOVE_ALREADY_MADE",
            };
        }


        // =========================
        // GET PLAYER
        // =========================

        const player =
            this.state.players.get(
                sessionId
            );

        if (!player) {
            return {
                success: false,
                reason: "PLAYER_NOT_FOUND",
            };
        }


        // =========================
        // GET PIECE
        // =========================

        const piece =
            player.pieces.get(
                pieceId
            );

        if (!piece) {
            return {
                success: false,
                reason: "PIECE_NOT_FOUND",
            };
        }


        // =========================
        // CALCULATE POSITION
        // =========================

        const newPosition =
            getNextPiecePosition(
                piece,
                this.state.diceValue,
                player.color,
                player
            );

        if (
            newPosition === null
        ) {
            return {
                success: false,
                reason: "INVALID_MOVE",
            };
        }


        // =========================
        // MOVE PIECE
        // =========================

        piece.position =
            newPosition;


        if (
            newPosition ===
            FINISH_POSITION
        ) {
            piece.status =
                "finished";
        } else {
            piece.status =
                "active";
        }


        // =========================
        // CAPTURE
        // =========================

        this.captureOpponents(
            player,
            piece
        );


        // =========================
        // MOVE REGISTERED
        // =========================

        this.state.moveMade =
            true;


        console.log(
            `♟️ ${player.name} moved ${piece.id} to ${newPosition}`
        );


        // =========================
        // VICTORY
        // =========================

        if (
            hasPlayerWon(player)
        ) {
            this.state.status = "finished";
            this.state.winnerId = player.sessionId;
            this.updateRankings();

            console.log(
                `🏆 ${player.name} won!`
            );

            return {
                success: true,
                pieceId,
                position: newPosition,
                winner: true,
            };
        }


        // =========================
        // NEXT TURN / REPLAY
        // =========================

        if (
            this.turnManager.shouldKeepTurn(
                this.state.diceValue
            )
        ) {

            // 🎲 6 → même joueur rejoue

            this.state.diceRolled =
                false;

            this.state.moveMade =
                false;

            this.state.diceValue =
                0;

            console.log(
                `🎲 ${player.name} keeps the turn`
            );

        } else {

            // ➡️ autre résultat → joueur suivant

            this.turnManager.nextTurn();

            console.log(
                "➡️ Next player:",
                this.state.currentPlayerId
            );
        }


        return {
            success: true,
            pieceId,
            position: newPosition,
            winner: false,
        };
    }
}
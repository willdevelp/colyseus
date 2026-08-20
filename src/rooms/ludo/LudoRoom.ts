import { Room, Client, CloseCode } from "colyseus";
import { LudoState } from "./schema/LudoState.js"
import { LudoPlayer } from "./schema/LudoPlayer.js"
import { LudoPiece } from "./schema/LudoPiece.js"
import { LudoGame } from "../../game/ludo/LudoGame.js";
import { PlayerColor, HOME_POSITION } from "../../game/ludo/LudoBoard.js";

export class LudoRoom extends Room {

    maxClients = 4;

    state = new LudoState();
    private game!: LudoGame

    onCreate(options: any) {
        console.log("Ludo room created:", this.roomId);
        console.log("Waiting for players to join...");

        this.game = new LudoGame(
            this.state
        );

        this.onMessage("ready", (client) => {
            const player = this.state.players.get(
                client.sessionId
            );

            if (!player) {
                return;
            }

            player.ready = !player.ready;

            console.log(
                player.name,
                "ready:",
                player.ready
            );

            const started = this.game.start();
            if (started) {
                console.log(
                    "🎮 Game started!"
                );
            }
        });

        this.onMessage(
            "rollDice",
            (client) => {

                const result =
                    this.game.rollDice(
                        client.sessionId
                    );

                console.log(
                    "Resultat du lancé:",
                    result
                );

                client.send(
                    "rollDiceResult",
                    result
                );
            }
        );

        this.onMessage(
            "movePiece",
            (client, message) => {

                const pieceId =
                    message?.pieceId;

                if (
                    typeof pieceId !==
                    "string"
                ) {
                    console.log(
                        "Invalid PieceId"
                    );

                    client.send(
                        "movePieceResult",
                        {
                            success: false,
                            reason: "INVALID_PIECE_ID",
                        }
                    );

                    return;
                }

                const result =
                    this.game.movePiece(
                        client.sessionId,
                        pieceId
                    );

                console.log(
                    "Move result:",
                    result
                );

                client.send(
                    "movePieceResult",
                    result
                );
            }
        );

        this.onMessage("selectColor", (client, message) => {
            const validColors: PlayerColor[] = ["red", "blue", "green", "yellow"];
            const requestedColor = message?.color as PlayerColor;

            if (!validColors.includes(requestedColor)) {
                client.send("selectColorResult", {
                    success: false,
                    reason: "INVALID_COLOR",
                });
                return;
            }

            if (this.state.status !== "waiting") {
                client.send("selectColorResult", {
                    success: false,
                    reason: "GAME_ALREADY_STARTED",
                });
                return;
            }

            const player = this.state.players.get(client.sessionId);

            if (!player) {
                client.send("selectColorResult", {
                    success: false,
                    reason: "PLAYER_NOT_FOUND",
                });
                return;
            }

            if (player.color === requestedColor) {
                client.send("selectColorResult", {
                    success: true,
                    color: requestedColor,
                });
                return;
            }

            // Si un autre joueur a déjà cette couleur, on échange les deux
            // couleurs plutôt que de refuser — ça reste toujours 4 couleurs
            // distinctes réparties entre les joueurs présents.
            const otherPlayer = Array.from(
                this.state.players.values()
            ).find(
                (p) =>
                    p.sessionId !== player.sessionId &&
                    p.color === requestedColor
            );

            const previousColor = player.color;

            player.color = requestedColor;
            player.ready = false;

            if (otherPlayer) {
                otherPlayer.color = previousColor;
                otherPlayer.ready = false;
            }

            console.log(
                `${player.name} choisit la couleur ${requestedColor}` +
                    (otherPlayer
                        ? ` (échange avec ${otherPlayer.name})`
                        : "")
            );

            client.send("selectColorResult", {
                success: true,
                color: requestedColor,
            });
        });

        this.onMessage("restartGame", () => {
            this.state.status = "waiting";
            this.state.currentPlayerId = "";
            this.state.winnerId = "";
            this.state.rankings = [];
            this.state.diceValue = 0;
            this.state.diceRolled = false;
            this.state.moveMade = false;
            this.state.players.forEach((player) => {
                player.ready = false;
                player.pieces.forEach((piece) => {
                    piece.position = -1;
                    piece.status = "home";
                });
            });
        });
    }

    onJoin(client: Client, options: any) {
        console.log("=================================");
        console.log("🎮 PLAYER JOIN");
        console.log("Room:", this.roomId);
        console.log("Session:", client.sessionId);
        console.log("Clients:", this.clients.length);
        console.log("Max clients:", this.maxClients);
        console.log("Options:", options);
        console.log("=================================");

        const player = new LudoPlayer();

        player.sessionId =
            client.sessionId;

        player.name =
            options?.name ??
            `Player ${this.state.players.size + 1}`;

        player.color =
            this.getPlayerColor();

        player.ready = false;

        this.createPieces(player);

        this.state.players.set(
            client.sessionId,
            player
        );

        console.log(
            `Player ${player.name} joined with color ${player.color}`
        );

        console.log(
            "Players:",
            this.state.players.size
        );
    }

    onLeave(client: Client, code: CloseCode) {
        console.log(
            "Player left:",
            client.sessionId,
        );

        const leavingPlayer = this.state.players.get(client.sessionId);
        this.state.players.delete(client.sessionId);

        if (this.state.status === "playing") {
            if (this.state.players.size < 2) {
                this.state.status = "waiting";
                this.state.currentPlayerId = "";
                this.state.winnerId = "";
                this.state.diceValue = 0;
                this.state.diceRolled = false;
                this.state.moveMade = false;
                this.state.rankings = [];
                return;
            }

            if (this.state.currentPlayerId === client.sessionId) {
                this.game.getTurnManager().nextTurn();
                this.state.diceValue = 0;
                this.state.diceRolled = false;
                this.state.moveMade = false;
            }
        }

        if (leavingPlayer && leavingPlayer.ready) {
            this.state.rankings = Array.from(this.state.players.keys());
        }

        console.log(
            "Players:",
            this.state.players.size
        )
    }

    onDispose() {
        console.log(
            "Ludo room disposed:",
            this.roomId
        );
    }

    private createPieces(
    player: LudoPlayer
) {

    for (let i = 0; i < 4; i++) {

        const piece =
            new LudoPiece();

        piece.id =
            `piece-${i}`;

        piece.position =
            HOME_POSITION;

        piece.status =
            "home";

        player.pieces.set(
            piece.id,
            piece
        );
    }
}

    private getPlayerColor(): PlayerColor {
        const colors: PlayerColor[] = [
            "red",
            "blue",
            "green",
            "yellow"
        ];

        const usedColors = Array.from(
            this.state.players.values()
        ).map((player) => player.color);

        return (
            colors.find(
                (color) => !usedColors.includes(color)
            ) ?? "red"
        )
    }
}
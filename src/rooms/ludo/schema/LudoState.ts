import { Schema, type, MapSchema } from "@colyseus/schema";
import { LudoPlayer } from "./LudoPlayer.js";
import { GAME_STATUS } from "../../../game/ludo/constants.js";

export class LudoState extends Schema {
  @type("string")
  status: string = "waiting";

  @type("string")
  currentPlayerId: string = "";

  @type("string")
  winnerId: string = "";

  @type(["string"])
  rankings: string[] = [];

    @type("number")
    diceValue: number = 0;

    @type("number")
    turnNumber: number = 0;

    @type("boolean")
    diceRolled: boolean = false;

    @type('boolean')
    moveMade: boolean = false;

    @type({map: LudoPlayer})
    players = new MapSchema<LudoPlayer>();
}
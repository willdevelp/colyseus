import { Schema, MapSchema, type } from "@colyseus/schema";
import { LudoPiece } from "./LudoPiece.js";
import { PlayerColor } from "../../../game/ludo/LudoBoard.js";

export class LudoPlayer extends Schema {
  @type("string")
  sessionId: string = "";

  @type("string")
  name: string = "";

  @type("string")
  color: PlayerColor = "red"

  @type("boolean")
  ready: boolean = false;

  @type({ map: LudoPiece })
   pieces = new MapSchema<LudoPiece>();
}
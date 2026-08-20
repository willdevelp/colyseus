import { Schema, type } from "@colyseus/schema";

export class LudoPiece extends Schema {
  @type("string")
  id: string = "";

  @type("number")
  position: number = -1;

  @type("string")
  status: string = "home";
}
import { MapSchema, Schema, Context, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") velX: number;
  @type("number") velY: number;
  @type("boolean") blueTeam: boolean;
  @type("boolean") alive: boolean;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

import { Room, Client } from "colyseus";
import { MyRoomState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {

  onCreate (options: any) {
    this.setState(new MyRoomState());

    // handle player input
    this.onMessage(0, (client, input) => {
      // get reference to the player who sent the message
      const player = this.state.players.get(client.sessionId);
      const velocity = 2;

      if (input.left) {
        player.x -= velocity;
      } else if (input.right) {
        player.x += velocity;
      } else if (input.up) {
        player.y -= velocity;
      } else if (input.down) {
        player.y += velocity;
      }

    });

  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const mapWidth = 800;
    const mapHeight = 600;
    // create a Player instance
    const player = new Player();

    // place player at a random position
    player.x = (Math.random() * mapWidth);
    player.y = (Math.random() * mapHeight);

    // place player in the map of player by its sessionId
    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}

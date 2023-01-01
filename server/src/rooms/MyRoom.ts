import { Room, Client } from "colyseus";
import { MyRoomState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {

  bluePlayers: number;
  orangePlayers: number;

  onCreate (options: any) {
    this.setState(new MyRoomState());

    this.bluePlayers = 0;
    this.orangePlayers = 0;

    // handle player input
    this.onMessage(0, (client, input) => {
      // get reference to the player who sent the message
      const player = this.state.players.get(client.sessionId);
      
      player.x = input.x;
      player.y = input.y;
      player.velX = input.velX;
      player.velY = input.velY;
    });
    
    // handle player input
    this.onMessage(0, (client, input) => {
      // get reference to the player who sent the message
      const player = this.state.players.get(client.sessionId);
      
      player.x = input.x;
      player.y = input.y;
      player.velX = input.velX;
      player.velY = input.velY;
    });
    
    // handle kills
    this.onMessage(1, (client, input) => {
      // get reference to the player who was killed the message
      const player = this.state.players.get(input);
      
      player.killTime = this.clock.currentTime;
      player.x = -10;
    });

    this.onMessage(2, (client, input) => {
      const player = this.state.players.get(client.sessionId);
      player.killTime = 0;
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

    // not dead
    player.killTime = 0;

    if (this.bluePlayers > this.orangePlayers) {
      this.orangePlayers ++;
      player.blueTeam = false;
    } else {
      this.bluePlayers ++;
      player.blueTeam = true;
    }

    // place player in the map of player by its sessionId
    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");

    if (this.state.players.get(client.sessionId).blueTeam) {
      this.bluePlayers --;
    } else {
      this.orangePlayers --;
    }

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}

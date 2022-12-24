import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
export class GameScene extends Phaser.Scene {
    preload() {
        // preload scene
        this.load.image('ship_0001', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png');
    }

    client = new Client("ws://localhost:2567");
    room: Room;

    playerEntities: {[sessionId: string]: any} = {};

    async create() {
        // create scene
        console.log("Joining room...");

        try {
            this.room = await this.client.joinOrCreate("my_room");

            this.room.state.players.onAdd = ((player, sessionId) => {
                console.log("A player has joined! Their unique sesion id is ", sessionId)

                const entity = this.physics.add.image(player.x, player.y, 'ship_0001');

                // keep a reference of it on `playerEntities`
                this.playerEntities[sessionId] = entity;
            });

            this.room.state.players.onRemove = ((player, sessionId) => {
                const entity = this.playerEntities[sessionId];
                if (entity) {
                    // destroy entity
                    entity.destroy();

                    // clear local reference
                    delete this.playerEntities[sessionId];
                }
            });

            console.log("Joined successfully!");
        } catch (e) {
            console.error(e);
        }
    }

    update(time: number, delta: number): void {
        // game loop
    }
}

// game config

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#b6d53c',
    parent: 'phaser-example',
    physics: { default: "arcade" },
    pixelArt: true,
    scene: [ GameScene ],
};

// instantiate the game
const game = new Phaser.Game(config)
import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
export class GameScene extends Phaser.Scene {
    preload() {
        // preload scene
    }

    client = new Client("ws://localhost:2567");
    room: Room;

    async create() {
        // create scene
        console.log("Joining room...");

        try {
            this.room = await this.client.joinOrCreate("my_room");
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
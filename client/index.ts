import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
export class GameScene extends Phaser.Scene {

    // local input cache
    inputPayload = {
        left: false,
        right: false,
        up: false,
        down: false
    }

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    remoteRef: Phaser.GameObjects.Rectangle;

    preload() {
        // preload scene
        this.load.image('ship_0001', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png');
        this.cursorKeys = this.input.keyboard.createCursorKeys();
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

                if (sessionId === this.room.sessionId) {

                    this.currentPlayer = entity;

                    this.remoteRef = this.add.rectangle(0,0, entity.width, entity.height);
                    this.remoteRef.setStrokeStyle(1, 0xff0000);

                    player.onChange = (() => {
                        this.remoteRef.x = player.x;
                        this.remoteRef.y = player.y;
                    })
                } else {
                    player.onChange = (() => {
                        // LERP during the render loop
                        entity.setData('serverX', player.x);
                        entity.setData('serverY', player.y);
                    })
                }
                
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
        // skip loop if not connected with room yet
        if (!this.room) { return; }

        // send input to the server
        const velocity = 2;
        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;
        this.room.send(0, this.inputPayload);

        if (this.inputPayload.left) {
            this.currentPlayer.x -= velocity;
        } else if (this.inputPayload.right) {
            this.currentPlayer.x += velocity;
        } else if (this.inputPayload.up) {
            this.currentPlayer.y -= velocity;
        } else if (this.inputPayload.down) {
            this.currentPlayer.y += velocity;
        }


        for (let sessionId in this.playerEntities) {

            if (sessionId === this.room.sessionId) {
                continue;
            }

            // interpolate all player entities
            const entity = this.playerEntities[sessionId];
            const { serverX, serverY } = entity.data.values;

            entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
            entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
        }
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
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

    positionPayload = {
        x: 0,
        y: 0
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


                var group = this.physics.add.group({
                    defaultKey: 'ship_0001',
                    bounceX: 1,
                    bounceY: 1,
                    collideWorldBounds: true
                })

                // const entity = this.physics.add.image(player.x, player.y, 'ship_0001');
                // entity.setGravityY(50);

                const entity = group.create(200, 300).setGravityY(50);

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

        if (this.inputPayload.left) {
            this.currentPlayer.setAcceleration(-100, 0);
        } else if (this.inputPayload.right) {
            this.currentPlayer.setAcceleration(100, 0);
        } else if (this.inputPayload.up) {
            this.currentPlayer.setAcceleration(0, -100);
        } else if (this.inputPayload.down) {
            this.currentPlayer.setAcceleration(0, 10);
        }

        // this.room.send(0, this.positionPayload);



        for (let sessionId in this.playerEntities) {

            if (sessionId === this.room.sessionId) {
                const currentPlayer = this.playerEntities[this.room.sessionId];
        
                this.positionPayload.x = this.currentPlayer.x;
                this.positionPayload.y = this.currentPlayer.y;
        
                
                this.room.send(0, this.positionPayload);
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
    backgroundColor: '#888888',
    parent: 'phaser-example',
    physics: { 
        default: "arcade",
        arcade: {
            debug: true
        }
     },
    pixelArt: true,
    scene: [ GameScene ],
};

// instantiate the game
const game = new Phaser.Game(config)
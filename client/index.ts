import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { CanvasSize, InputPayload, PositionPayload } from "./types";
export class GameScene extends Phaser.Scene {


    inputPayload: InputPayload;
    positionPayload: PositionPayload;

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    currentPlayer: Phaser.Physics.Matter.Image;
    remoteRef: Phaser.GameObjects.Rectangle;

    client = new Client("ws://localhost:2567");
    room: Room;

    playerEntities: {[sessionId: string]: Phaser.Physics.Matter.Image} = {};

    preload() {
        // preload scene
        this.load.image('ship_0001', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png');
        this.load.image('day_map', 'assets/day_map_background.png');
        this.cursorKeys = this.input.keyboard.createCursorKeys();

        this.inputPayload = {
            left: false,
            right: false,
            up: false,
            down: false
        }

        this.positionPayload = {
            x: 0,
            y: 0,
            velX: 0,
            velY: 0,
        }
    }

    async create() {
        // create scene
        console.log("Joining room...");

        try {
            this.room = await this.client.joinOrCreate("my_room");
            const canvas = this.setupGameBackground();

            this.room.state.players.onAdd = ((player, sessionId: string) => {
                let entity: Phaser.Physics.Matter.Image = this.setupRoom(sessionId, canvas.width, canvas.height);
                this.setupOnChangeListeners(player, sessionId, entity);    
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

            const spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            spaceBar.on('down', () => {
                this.currentPlayer.thrust(0.75);
            })

            console.log("Joined successfully!");
        } catch (e) {
            console.error(e);
        }
    }

    update(time: number, delta: number): void {
        // game loop
        // skip loop if not connected with room yet
        if (!this.room) { return; }

        this.processInput();

        for (const sessionId in this.playerEntities) {
            this.updatePlayerEntities(sessionId);
        }
    }


    setupGameBackground = (): CanvasSize => {
        const mapName: string = "day_map";
        const mapImage = this.textures.get(mapName).getSourceImage();
        const width: number = this.sys.game.scale.gameSize.width;
        const height: number = width * mapImage.height / mapImage.width;

        const canvas: CanvasSize = {
            width: width,
            height: height
        }

        const background: Phaser.GameObjects.Image = this.add.image(0, 0, mapName);
        background.setScale(width / mapImage.width, height / mapImage.height);
        background.setOrigin(0, 0);

        return canvas;
    }

    setupRoom = (sessionId: string, width: number, height: number): Phaser.Physics.Matter.Image => {
        console.log("A player has joined! Their unique sesion id is ", sessionId)

        const entity = this.matter.add.image(40, 50, 'ship_0001');
        entity.setFixedRotation();
        entity.setMass(30);
        entity.setFrictionAir(0.05);
        entity.setAngle(270);
        
        this.matter.world.setBounds(0,0, width, height);

        // keep a reference of it on `playerEntities`
        this.playerEntities[sessionId] = entity;

        return entity;
    }

    setupOnChangeListeners = (player, sessionId: string, entity: Phaser.Physics.Matter.Image): void => {
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
                entity.setData('serverVelX', player.velX);
                entity.setData('serverVelY', player.velY);
            })
        }
    }

    



    processInput = () => {
        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;

        if (this.inputPayload.left) {
            this.currentPlayer.thrustLeft(0.02);
        } else if (this.inputPayload.right) {
            this.currentPlayer.thrustRight(0.02);
        } else if (this.inputPayload.up) {
            this.currentPlayer.thrust(0.1);
        } else if (this.inputPayload.down) {
            this.currentPlayer.thrustBack(0.1);
        }
    }

    updatePlayerEntities = (sessionId: string): void => {
        if (sessionId === this.room.sessionId) {
            const currentPlayer = this.playerEntities[this.room.sessionId];
    
            this.positionPayload.x = this.currentPlayer.x;
            this.positionPayload.y = this.currentPlayer.y;
            // console.log(this.currentPlayer.body);
            this.positionPayload.velX = this.currentPlayer.body.velocity.x;
            this.positionPayload.velY = this.currentPlayer.body.velocity.y;
    
            
            this.room.send(0, this.positionPayload);
            return;
        }

        // interpolate all player entities
        const entity = this.playerEntities[sessionId];
        // console.log(entity.data.values);
        const { serverX, serverY, serverVelX, serverVelY } = entity.data.values;
        
        if (serverVelX === undefined || serverVelY === undefined) {
            return;
        }

        entity.x = Phaser.Math.Linear(entity.x, serverX, 0.5);
        entity.y = Phaser.Math.Linear(entity.y, serverY, 0.5);
        entity.setVelocityX(serverVelX);
        entity.setVelocityY(serverVelY);
    }


}

// game config

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1200,
    height: 908 * 1200/1617,
    backgroundColor: '#888888',
    parent: 'phaser-example',
    physics: { 
        default: "matter",
        matter: {
            gravity: {
                x: 0,
                y: 1
            },
            debug: true
        }
     },
    pixelArt: true,
    scene: [ GameScene ],
};

// instantiate the game
const game = new Phaser.Game(config)

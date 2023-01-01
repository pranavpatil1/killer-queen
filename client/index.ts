import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { CanvasSize, InputPayload, PositionPayload } from "./types";
import { Player } from "./sprites/player";
export class GameScene extends Phaser.Scene {


    inputPayload: InputPayload;
    positionPayload: PositionPayload;

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    currentPlayer: Player;

    client = new Client("ws://localhost:2567");
    room: Room;

    playerEntities: {[sessionId: string]: Player} = {};

    preload() {
        // preload scene
        this.load.image('ship_0001', 'https://cdn.glitch.global/3e033dcd-d5be-4db4-99e8-086ae90969ec/ship_0001.png');
        this.load.image('day_map', 'assets/day_map_background.png');
        this.load.spritesheet('queen_blue', 'assets/queen_spritesheet.png', { frameWidth: 50, frameHeight: 50 });
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
            
            const mapName: string = "day_map";
            const canvas = this.setupGameBackground(mapName);
            this.setupPlatforms(mapName);

            this.room.state.players.onAdd = ((player, sessionId: string) => {
                let entity: Player = this.setupRoom(sessionId, canvas.width, canvas.height);
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
                this.currentPlayer.thrust(0.375);
                this.currentPlayer.anims.play('queen_fly');
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


    setupGameBackground = (mapName: string): CanvasSize => {
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

    setupRoom = (sessionId: string, width: number, height: number): Phlayer => {
        console.log("A player has joined! Their unique sesion id is ", sessionId)

        const entity = new Player(this.matter.world, 'queen_blue', [
            {"x": 8, "y": 0},
            {"x": 50, "y": 0},
            {"x": 50, "y": 20},
            {"x": 8, "y": 20}
        ]);
        this.add.existing(entity);

        entity.setFixedRotation();
        entity.setMass(30);
        entity.setFrictionAir(0.05);
        entity.setAngle(270);

        this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
            this.currentPlayer.anims.play('queen_walk');
        });

        this.anims.create({
            key: 'queen_fly',
            frames: this.anims.generateFrameNumbers('queen_blue', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'queen_dive',
            frames: this.anims.generateFrameNumbers('queen_blue', { start: 2, end: 2 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'queen_walk',
            frames: this.anims.generateFrameNumbers('queen_blue', { start: 3, end: 4 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'queen_idle',
            frames: this.anims.generateFrameNumbers('queen_blue', { start: 5, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

        entity.anims.play('queen_walk');
        
        this.matter.world.setBounds(0,0, width, height);

        // keep a reference of it on `playerEntities`
        this.playerEntities[sessionId] = entity;

        return entity;
    }

    setupPlatforms = (mapName: string): void => {
        if (mapName == "day_map") {
            const scaleFactor = 1200 / 1617;
            const rawDims = [
                {"x": 0, "y": 897, "w": 1617, "h": 11},
                {"x": 0, "y": 795, "w": 94, "h": 21},
                {"x": 298, "y": 795, "w": 50, "h": 18},
                {"x": 589, "y": 795, "w": 438, "h": 18},
                {"x": 1268, "y": 795, "w": 50, "h": 18},
                {"x": 1522, "y": 795, "w": 94, "h": 18},
                {"x": 163, "y": 694, "w": 67, "h": 18},
                {"x": 418, "y": 694, "w": 100, "h": 18},
                {"x": 758, "y": 694, "w": 100, "h": 18},
                {"x": 1098, "y": 694, "w": 100, "h": 18},
                {"x": 1386, "y": 694, "w": 67, "h": 18}
            ];
            rawDims.forEach(val => {
                val.x *= scaleFactor;
                val.y *= scaleFactor;
                val.w *= scaleFactor;
                val.h *= scaleFactor;
                const platform: MatterJS.BodyType = this.matter.add.rectangle(val.x + val.w / 2, val.y + val.h / 2, val.w, val.h);
                platform.isStatic = true;
            })
        }
    }

    setupOnChangeListeners = (player, sessionId: string, entity: Player): void => {
        if (sessionId === this.room.sessionId) {
            this.currentPlayer = entity;
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
            this.currentPlayer.setFlipY(true);
        } else if (this.inputPayload.right) {
            this.currentPlayer.thrustRight(0.02);
            this.currentPlayer.setFlipY(false);
        } else if (this.inputPayload.up) {
            this.currentPlayer.thrust(0.1);
        } else if (this.inputPayload.down) {
            this.currentPlayer.thrustBack(0.1);
            this.currentPlayer.anims.play('queen_dive');
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

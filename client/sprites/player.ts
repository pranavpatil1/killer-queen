export class Player extends Phaser.Physics.Matter.Sprite {
    // if they have the speed boost power up
    speedBoost: boolean;
    // what team they are on (doesn't change)
    blueTeam: boolean;
    // either for queen or when they power up to warrior
    warriorMode: boolean;

    constructor (world: Phaser.Physics.Matter.World, texture: string, blueTeam: boolean, warriorMode: boolean, boundingBox: Array) {
        super(world, 0, 0, texture, null, {
            // notice that these coords are on a rotated spritesheet. did a bit of guess and check
            vertices: boundingBox
        });
        this.blueTeam = blueTeam;
        this.speedBoost = false;
        this.warriorMode = warriorMode;
    }

    respawn(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}
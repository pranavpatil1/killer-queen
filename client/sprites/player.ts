export class Player extends Phaser.Physics.Matter.Sprite {
    // if they have the speed boost power up
    speedBoost: boolean;
    // what team they are on (doesn't change)
    blueTeam: boolean;
    // either for queen or when they power up to warrior
    warriorMode: boolean;
    // represents time they were killed or 0 if not dead
    killTime: number;

    respawnLoc: {[axis: string]: number} = {};

    static blueGroup: number = -1;
    static orangeGroup: number = -2;

    constructor (world: Phaser.Physics.Matter.World, texture: string, blueTeam: boolean, warriorMode: boolean, boundingBox: any) {
        super(world, 500, 50, texture, null, {
            // notice that these coords are on a rotated spritesheet. did a bit of guess and check
            vertices: boundingBox
        });
        
        this.blueTeam = blueTeam;
        this.speedBoost = false;
        this.warriorMode = warriorMode;
        this.killTime = 0;
        
        if (!this.blueTeam) {
            this.setX(700);
        }
        
        this.respawnLoc["x"] = this.x;
        this.respawnLoc["y"] = this.y;

        if (this.blueTeam) {
            this.setCollisionGroup(Player.blueGroup);
        } else {
            this.setCollisionGroup(Player.orangeGroup);
        }
    }

    respawn() {
        this.x = this.respawnLoc["x"];
        this.y = this.respawnLoc["y"];;
    }


}
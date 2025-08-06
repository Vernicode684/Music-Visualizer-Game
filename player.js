export default class Player{
    WALK_ANIMATION_TIMER = 200;
    walkAnimationTimer = this.WALK_ANIMATION_TIMER;
    dinoRunImages =[];

    jumpPressed = false;
    jumpInProgress = false;
    falling = false;
    JUMP_SPEED = 0.6;
    GRAVITY = 0.4;

    constructor(ctx, width, height, minJumpHeight, maxJumpHeight, scaleRatio){
        this.ctx = ctx;
        this.game = ctx.canvas;
        this.width = width;
        this.height= height;
        this.minJumpHeight = minJumpHeight;
        this.maxJumpHeight = maxJumpHeight;
        this.scaleRatio = scaleRatio;
        
        this.x= 10 * scaleRatio;
        this.y= this.game.height - this.height - 1.5 * scaleRatio;
        this.yStandingPosition = this.y;

        this.standingStillImage = new Image();
        this.standingStillImage.src= "images/standing_still.png";
        this.image = this.standingStillImage;

        const dinoRunImage1 = new Image ();
        dinoRunImage1.src = 'images/dino_run1.png';
        
        const dinoRunImage2 = new Image ();
        dinoRunImage2.src = 'images/dino_run2.png';

        this.dinoRunImages.push(dinoRunImage1);
        this.dinoRunImages.push(dinoRunImage2);

        //keyboard//
        window.removeEventListener('keydown', this.keydown); //why do we remove event listeners before adding them?
        window.removeEventListener('keyup', this.keyup);

        window.addEventListener('keydown', this.keydown);
        window.addEventListener('keyup', this.keyup);

        //touch//
        window.removeEventListener('touchstart', this.touchstart );
        window.removeEventListener('touchend', this.touchend);

        window.addEventListener('touchstart', this.touchstart );
        window.addEventListener('touchend', this.touchend);

    }
    
    //touching the screen
    touchstart  = (event) => {
        event.preventDefault();
        this.jumpPressed = true;
    }

    //not touching the screen
    touchend = (event) => {
        event.preventDefault();

        this.jumpPressed = false;
    }

    //when the key is pressed down 
    keydown = (event) => {
        if (event.code === "Space"){
            event.preventDefault();
            this.jumpPressed = true;
        }
    };

    //when the key is not pressed down --> 'keyup'
    keyup = (event) => {
        if (event.code === "Space"){
            this.jumpPressed = false;
        }
    };

    update(gameSpeed, frameTimeDelta){
            console.log(this.jumpPressed);
            this.run(gameSpeed, frameTimeDelta);
 
            if (this.jumpInProgress){
                this.image = this.standingStillImage;
            }

            this.jump(frameTimeDelta);

    }

    jump(frameTimeDelta){
        if(this.jumpPressed){
            this.jumpInProgress = true;
        }

        if (this.jumpInProgress && !this.falling){

            if (
                
                //if the the player holds the jump button for a short time
               (this.y > this.game.height - this.minJumpHeight) ||
               //if the player holds the jump button longer
               (this.y > this.game.height - this.maxJumpHeight && this.jumpPressed))
                {
                    this.y -=this.JUMP_SPEED * frameTimeDelta * this.scaleRatio;
                }
                else{ //when the dino recahes maxHeight or the player lets go of jump
                    this.falling = true; //the dino is falling
                }
        } 

        else{ 
            if(this.y < this.yStandingPosition){
                //when the dino is falling towards the ground
                this.y += this.GRAVITY * frameTimeDelta * this.scaleRatio;
                if(this.y + this.height > this.game.height){
                    this.y= this.yStandingPosition;
                }
            }
            else { // when the dino is on the ground
                this.falling = false;
                this.jumpInProgress = false;
            }
        }
    }

    run(gameSpeed, frameTimeDelta){
        if (this.walkAnimationTimer <=0){
                if(this.image === this.dinoRunImages[0]){
                    this.image= this.dinoRunImages[1];
                } else{
                    this.image = this.dinoRunImages[0];
                }
                this.walkAnimationTimer= this.WALK_ANIMATION_TIMER;
            }
            this.walkAnimationTimer -= frameTimeDelta * gameSpeed;
        }
    draw (){
        this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}


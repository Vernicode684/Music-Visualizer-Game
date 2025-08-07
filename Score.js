export default class Score {
    
    score = 0;
    HIGHT_SCORE_KEY = "highScore";


    constructor(ctx, scaleRatio){
        this.ctx = ctx;
        this.game= ctx.canvas;
        this.scaleRatio = scaleRatio;
    }

    update(frameTimeDelta){
        this.score += frameTimeDelta * 0.01;
    }

    reset(){
        this.score = 0;
    }

    setHighScore(){
        const highScore = Number(localStorage.getItem(this.HIGHT_SCORE_KEY));
        if(this.score > highScore){
            localStorage.setItem(this.HIGHT_SCORE_KEY, Math.floor(this.score));
        }
    }

    draw(){
        const highScore = Number(localStorage.getItem(this.HIGHT_SCORE_KEY));
        const y = 20 * this.scaleRatio;

        const fontSize =  20 * this.scaleRatio;
        this.ctx.font = `${fontSize}px Courier New`;
        this.ctx.fillStyle = "#ffffffff";
        const scoreX = this.game.width - 75 * this.scaleRatio;
        const highsScoreX = scoreX- 125 * this.scaleRatio;

        const scorePadded = Math.floor(this.score).toString().padStart(6,0);
        const highScorePadded = highScore.toString().padStart(6,0);

        this.ctx.fillText(scorePadded, scoreX, y);
        this.ctx.fillText(`HI ${highScorePadded}`, highsScoreX, y);
    }
}
/*****************************************************************************************************************************************************************************************
 * 
 * 												  											liveBG
 * 												  							
 * 												  							This is a live background created for the
 *                                                                          roboSeg command list page.
 * 												  							
 *  											  										  - Seglectic Softworks 2019										
 * 
 *****************************************************************************************************************************************************************************************/




/*************************************************
 *				Display Setup
 *				Prepares canvas and DOM for use
 *				as dedicated game display unit.
 */
const canvas = document.createElement("canvas");
canvas.id = "liveBG";
canvas.height=window.innerHeight;
canvas.width=window.innerWidth;
const c = canvas.getContext("2d");
document.body.appendChild(canvas);
//Disable right-click context menu
canvas.oncontextmenu = function (e) {e.preventDefault();};
//Handle resizing window
function resizeHandler(){
	c.canvas.height = window.innerHeight;
	c.canvas.width = window.innerWidth;
};
window.addEventListener('resize', resizeHandler);



/**********************************************************
 * 				Miscellany
 * 		Various functions for inhabitants 
 * 		to use, notably multifunctional 
 * 
 */
//Random range from [min] to [max], bool [int] if rounding
const RNG = function(min,max,int){
	let RNG = (Math.random()*(max-min))+min;
	if (int){RNG = Math.floor(RNG);}
	return RNG;
};


//Clear background transparently
bG = function(){
    c.fillStyle= "rgba(10,10,20,1)";
    c.clearRect(0,0,canvas.width,canvas.height);
};



/**
 *  Creates a 'bit' object
 *  A small 1 or 0 that moves across the screen
 *  and is attracted to the user's mouse or pointer
 * 
 * TODO: Make move based on perlin noise
 */
var bitBois = []; //Container

bitBoi = function(mX,mY){
    this.x = Math.random()*canvas.width;
    this.y = Math.random()*canvas.height;
    this.lastX = this.x;
    this.lastY = this.y;
    this.xVel = RNG(-3,3);
    this.yVel = RNG(-3,3);
    this.alpha = RNG(0.1,0.3)
    this.size = 12;
    //Choose to be a 0 or 1   
    this.char = 0;
    if(Math.random()>=0.5){this.char = 1;}

    //Check if collided with side of canvas
    this.collideBorder = function(){
        if(this.x<this.size||this.y<this.size||this.x>canvas.width-this.size||this.y>canvas.height-this.size){
            return true;
        }else{return false;}
    }

    //Update the bitty
    this.update = function(){
        this.x+=this.xVel;
        this.y+=this.yVel;

        if(this.collideBorder()){
            this.x=this.lastX;
            this.y=this.lastY;
            this.xVel = RNG(-5,5);
            this.yVel = RNG(-5,5);
        }

        this.lastX = this.x;
        this.lastY = this.y;
        this.draw();
    }

    //Draw bit
    this.draw = function(){
        c.font = this.size+"px Arial"
        c.fillStyle = "rgba(0,0,0,"+this.alpha+")"
        c.fillText(this.char,this.x,this.y);
    }
    bitBois.push(this);
}

for (let i = 0; i < 250; i++) {
    new bitBoi();
}






/*****************************************************************************************************************************************************************************************
 * 																	MAIN LOOP
 * 													Tick through every instant and run update
 * 													routines to create the illusion of time																					
 */

picoLoop = function(){
	if(document.isHidden){console.log("Skree")};
    bG();
    
    //Get Mouse Position

    //Update all bitbois
    for (let i = 0; i < bitBois.length; i++) {
        bitBois[i].update();
    }
	//scanLines();
};


setInterval(picoLoop,20);
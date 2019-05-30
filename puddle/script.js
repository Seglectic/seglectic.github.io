/*
							PUDDLE
						
		Puddle is an environment for cellular automata 
		called "Blorbs" to eke out their lives within
		your browser. They are born, eat, poop and die.

		Please appreciate them.
*/



/*
				  Environment Setup
		This section is for the preparation of
		the web environment to allow to for a 
		a decent browser experience
*/

canvas = document.createElement("canvas");
canvas.id = "game";
canvas.height=window.innerHeight-22;
canvas.width=window.innerWidth-22;
c = canvas.getContext("2d");
document.body.appendChild(canvas);

//Disable right-click context menu
canvas.oncontextmenu = function (e) {e.preventDefault();};



/*
				General-Purpose Function Declaration
		This section reserved for general functions that find
		use throughout puddle and not specific to any object
*/

//Check if 2D point within circle (point x, point y, (x,y,radius) of circle)
pointCircleCollide = function(px,py,x,y,r){
	x -= r;
	y -= r;
	w = (r*2);
	h = (r*2);
	if(px>x&px<x+w&py>y&py<y+h){return true;}
	else{return false;}
};

//Check if 2D point within rectangle (point x, point y, (x,y,width,height) of rect)
pointRectCollide = function(px,py,x,y,w,h){
	if(px>x&px<x+w&py>y&py<y+h){return true;}
};

//Return 2D distance
distance = function(x1,y1,x2,y2){
	var d = Math.sqrt( ((x2-x1)*(x2-x1)) + ((y2-y1)*(y2-y1)) );
	return d;
};

//Check collision between two circles
circleCollide = function(x1,y1,r1,x2,y2,r2){
	var d = distance(x1,y1,x2,y2);
	var rDist = r1+r2
	if (d<=rDist){return true;}
	else{return false;}
}

//Random range from [min] to [max], bool [int] if rounding
RNG = function(min,max,int){
	var RNG = (Math.random()*(max-min))+min;
	if (int){RNG = Math.floor(RNG);}
	return RNG;
};

codeName = function(){
	var code = ['cute','sly','lone','rancid','dancing','psycho','awkward','quiet','loud','snapping','sea','blue','red','green','tiny','mini','cold','hot','hyper','mellow','tasty','nasty','kawaii','ultra']
	var naem = ['Eagle','Owl','Rat','Leopard','Monkey','Snail','Turtle','Cactus','Eel','Salmon','Hedgehog','Bear','Wolf','Coyote','Ox','Frog','Octopus','Squid','Okapi','Ant','Narwhal','Crab','Shrimp','Cicada','Moth','Cobra','Mantis','Viper','Osprey','Pig','Blorb'] 
	return code[Math.floor(Math.random()*code.length)]+naem[Math.floor(Math.random()*naem.length)];
}

//Creates a '+' particle emitter for healing Blorbs
emitter = function(x,y,amount,decay){
	this.particles = []
	this.x=x; this.y=y;
	this.active = false;
	var self = this;
	//Creates a particle and adds itself to list.
	this.particle = function(x,y,decay){
		this.decay = decay; 		 	//Fade rade
		this.x=x; this.y=y; 		 	//Coords
		this.alpha= -1; 	//Initial alpha
		this.vx=Math.random()-0.5; this.vy=Math.random()-0.5;
		this.update = function(){ //Update & draw the particle
			this.alpha -= this.decay;
			if(this.alpha>-0.9){
				this.x+=this.vx; this.y-=this.vy;
			}else{
				this.alpha=1;
				this.vx=Math.random()-0.5; this.vy=Math.random()-0.5;
				this.x = self.x; this.y = self.y;
			}
			c.fillStyle = "rgba(255,0,0,"+this.alpha+")";
			c.fillRect(this.x,this.y-4,1,8);
			c.fillRect(this.x-4,this.y,8,1);
		}
		self.particles.push(this);
	};
	this.update = function(){ 	//Update the Emitter
		//c.fillRect(this.x,this.y-20,10,10);
		if (!this.active){
			for (var i = 0; i < this.particles.length; i++) {
				this.particles[i].alpha=-1; return;
			};
		};
		for (var i = 0; i < this.particles.length; i++) {
			this.particles[i].update();
		};
	}
	for (var i = 0; i < amount; i++) {this.particles.push(new this.particle(this.x,this.y,decay));}; //Populate local particle array
};




/*
				Mouse Interaction
		Creates a global mouse object for 
		handling viewer's mouse interaction.
*/
mouse = function(){
	this.x= -100;
	this.y= -100;
	this.lClick= false;
	this.rClick= false;
	this.mClick = false;
	this.lrClick = false;

	this.mouseMove = function(e){
		var env = canvas.getBoundingClientRect();
		mouse.x=e.clientX-env.left;
		mouse.y=e.clientY-env.top;		
	}
	canvas.addEventListener('mousemove',this.mouseMove)

	this.mouseDown = function(e){
		if (e.buttons==1){mouse.lClick=true;}
		if (e.buttons==2){mouse.rClick=true;}
		if (e.buttons==3){mouse.lrClick=true;}
		if (e.buttons==4){mouse.mClick=true;}

	};
	canvas.addEventListener('mousedown',this.mouseDown);

	this.mouseUp = function(e){
		if (e.buttons==0){
			mouse.lClick=false;
			mouse.rClick=false;
			mouse.lrClick=false;
			mouse.mClick=false;
		}
	};
	canvas.addEventListener('mouseup',this.mouseUp);
}
mouse();



/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
				Blorb Object Prototype
		These are the main characters of puddle;
		roaming about, eating food, shitting and
		dying are their main past-times.
*/
blorb = function(x,y){

	this.name = codeName();
	//Genetic properties
	this.baseRadius = RNG(5,10); //Starting r
	this.radius = this.baseRadius;		  //Current r
	this.x = x || RNG(this.radius,canvas.width-this.radius);
	this.y = y || RNG(this.radius,canvas.height-this.radius);
	//Initial velocities (5 is quite fast)
	this.vx = RNG(-3,3);  
	this.vy = RNG(-3,3);
	this.arc = 0;
	this.strokeClr = {r:20,g:20,b:90};
	this.fillClr = {r:20,g:200,b:20};
	//How thick to draw the line around nucleus
	this.baseMembrane = 5;
	this.membrane = this.baseMembrane; 
	//How often to roam
	this.roamTimer = new Date().getTime() + RNG(2000,3000);
	this.roamInterval = RNG(1000,3000);
	this.jigIntensity = (this.roamInterval/1000)*RNG(1,5,true);
	//How often to convery food into energy
	this.metabolicTimer = new Date().getTime()+(Math.random()*5000);
	this.metabolicInterval = RNG(5000,10000);
	//How quickly to rot
	this.rotTimer = new Date().getTime();
	this.rotInterval = 100;
	//Health properties
	this.hp = 100;							//Health level
	this.energy = 20;						//Stored energy used for movement
	this.gut = 50; 							//How much food in stomach
	this.CND= "UNKNOWN";					//Current status
	this.foodTarget = null; 				//Reference to desired object
	//Sniff 'radar' properties
	this.sniffRange = 35;
	this.sniffRadius = 0;
	this.sniffAlpha = 1;
	this.sniffSpeed = 1;
	this.sniffTimer = new Date().getTime();
	this.sniffInterval = RNG(2000,4000);
	this.baseSniffInterval = this.sniffInterval;
	this.emitter = new emitter(this.x,this.y,5,0.01)

	//Check for collision vs other Blorbs
	this.blorbCollide = function(){
		var me = blorbs.indexOf(this);  //Index of local blorb
		for (var i = 0; i < blorbs.length; i++) {
			var b = blorbs[i]
			//If self, continue
			if (me == i){continue};	
			//If not near enough to collide, continue
			if(!( this.x + this.radius + b.radius + this.membrane + b.membrane >b.x 
				& this.x < b.x + this.radius + b.radius  + this.membrane + b.membrane
				& this.y + this.radius + b.radius + this.membrane + b.membrane > b.y	
				& this.y < b.y + this.radius + b.radius + this.membrane + b.membrane))
			{
				continue;
			}
			//If actual circle collision fails, continue
			if(!circleCollide(this.x,this.y,this.radius,b.x,b.y,b.radius)){
				continue;
			}
			//Invert velocity upon collision
			this.vx*=-1; this.vy*=-1;
			b.vx*=-1; b.vy* -1;
			this.x+=this.vx; this.y+=this.vy;
			b.x+=b.vx; b.y+=b.vy;
			
			/*Elastic collision:
			var mass1 = this.radius*10;	var mass2 = b.radius*10;
			this.vx = (this.vx * (mass1 - mass2) + (2 * mass2 * b.vx)) / (mass1 + mass2);
			this.vy = (this.vy * (mass1 - mass2) + (2 * mass2 * b.vy)) / (mass1 + mass2);
			b.vx = (b.vx * (mass2 - mass1) + (2 * mass1 * this.vx)) / (mass1 + mass2);
			b.vy = (b.vy * (mass2 - mass1) + (2 * mass1 * this.vy)) / (mass1 + mass2);
			*/
		};
	}

	//Move blorb according to velocity
	this.move = function(){
		if(this.CND == "DECEASED"){return}
		this.x += this.vx;
		this.y += this.vy;
		//Bounce Blorb on wall collision
		var size = this.radius+this.membrane
		if (this.x+size>canvas.width){
			this.x = canvas.width-size;
			this.vx*= -0.8;
		};
		if (this.x<size){
			this.x = size;
			this.vx*= -0.8;
		}
		if (this.y+size>canvas.height){
			this.y = canvas.height-size;
			this.vy*= -0.8;
		};
		if (this.y<size){
			this.y = size;
			this.vy*= -0.8;
		}
		//Apply friction
		this.vx += (0 - this.vx)*0.03;
		this.vy += (0 - this.vy)*0.03;
	}

	//Updates blorb velocity at interval
	this.roam = function(time){
		if(this.energy<=0){return};
		if(time<(this.roamTimer+this.roamInterval)){return};
		if(this.foodTarget){return};
		this.roamTimer = time;

		//Randomize velocity vector	
		this.vx = RNG(-2,2);
		this.vy = RNG(-2,2);
		//Consume energy based on velocity magnitude average
		this.energy -= (Math.abs(this.vx+this.vy)/2);
	};

	//Sniffs for nearby food shrimps
	this.sniff = function(time){
		if(this.hp<=0 || this.foodTarget!= null){return;}
		if (time<(this.sniffTimer+this.sniffInterval)){return};

		if(this.CND == "HAPPY" || this.CND == "HEALING"){
			this.sniffInterval = this.baseSniffInterval; 
			this.sniffRange=50;
			this.sniffSpeed = 1;
		};
		if(this.CND == "HUNGRY"){
			this.sniffInterval=RNG(500,1000); 
			this.sniffRange=100;
			this.sniffSpeed = 3;
		};
		if(this.CND == "DYING"){
			this.sniffInterval = 0; 
			this.sniffRange=150
			this.sniffSpeed = RNG(3,5);
		}

		if (this.sniffRadius>this.sniffRange){
			this.sniffTimer = time;
			this.sniffAlpha = 1;
			this.sniffRadius = 0;
		}
		this.sniffRadius += this.sniffSpeed;
		this.sniffAlpha = (1-(this.sniffRadius/this.sniffRange))*0.4;

		for (var i = shrimps.length - 1; i >= 0; i--) {
			var s = shrimps[i];
			var dist = distance(s.x,s.y,this.x,this.y)
			if(dist<this.sniffRadius){ 
				this.foodTarget = s;
				this.sniffTimer = time;
				this.sniffAlpha = 1;
				this.sniffRadius = 0;
				break;
			}
		};
	}

	//Move toward food if located
	this.nomf = function(time){
		//Consume shrimp regardless if timer passed
		if(this.foodTarget == null){return};
		if(shrimps.indexOf(this.foodTarget)==-1){
			this.foodTarget=null;
			return;
		}
		var s = this.foodTarget;
		if(distance(s.x,s.y,this.x,this.y)<this.radius&this.energy>=1){
			this.gut+=s.nutrition;
			shrimps.splice(shrimps.indexOf(s),1);
			this.foodTarget=null;
		}

		if(this.energy<=0){return};
		if(time<(this.roamTimer+this.roamInterval)){return};
		if(this.gut>200){this.foodTarget = null; return};

		this.roamTimer = time;

		//Calculate velocity vector
		var dx = (s.x - this.x)
		var dy = (s.y - this.y)
		var magnitude = Math.sqrt(dx*dx + dy*dy);
		this.vx = dx/magnitude * 3;
		this.vy = dy/magnitude * 3;
	}

	//Give blorb different proportions based on food levels
	this.fat = function(){
		var fat = this.baseMembrane * (this.energy/50) 
		var nucleus = this.baseRadius*(this.gut/100)+3
		if(nucleus<5){nucleus=5;}
		if(fat<3){fat=3;}
		this.membrane += fat-this.membrane;
		this.radius += (nucleus-this.radius); 
	}

	//Turn food in gut into energy
	this.metabolize = function(time){
		if(time<(this.metabolicTimer+this.metabolicInterval)){return;}
		this.metabolicTimer = time;
		
		//Take units from gut and convert to energy
		if(this.gut>0&this.energy<100){
			var digest = RNG(5,15);
			if (digest>this.gut){digest = this.gut} //Prevents overdrawing
			this.gut-= digest;
			this.energy+= digest*0.8;
			if (this.energy>100){this.energy=100}
			poops.push(new poop(this.x,this.y,digest*0.2)); //haha; push poops.
		}

		//Convert HP into energy when starving
		if(this.energy<=0&this.gut<=0&this.hp>0){
			var atrophy = RNG(5,10)
			if (atrophy>this.hp){atrophy=this.hp}
			this.hp -= atrophy;
			this.energy+= atrophy*0.6;
			if(this.energy>100){this.energy=100;}
		}

		//Convert energy to HP when hurt
		if(this.hp<100&this.energy>=10){
			this.emitter.active = true;
			this.hp+=RNG(10,20);
			this.energy-=2;
			if(this.hp>100){this.hp=100;}
		}else{
			this.emitter.active = false;
		}
		this.energy = Math.floor(this.energy);
	};

	//Determines what should be done when Blorbs are dead
	this.rot = function(time){
		if(time<(this.rotTimer+this.rotInterval)){return;}
		this.rotTimer = time;
		if(this.fillClr.r < 40){
			this.fillClr.r += 1;
		}	
		if(this.fillClr.g > 0){
			this.fillClr.g -= 1;
		}
		if(this.strokeClr.r < 255){
			this.strokeClr.r +=1;
		}
		if(this.strokeClr.g < 255){
			this.strokeClr.g +=1;
		}
		if(this.strokeClr.b < 255){
			this.strokeClr.b +=1;
		}
	};

	//Analyze condition of Blorb
	this.condition = function(){
		if(this.energy<=0){
			this.CND = "TIRED";
		}
		if(this.gut>0&this.energy>0&this.hp>30){
			this.CND="HAPPY";
		}
		if(this.gut>0&this.energy>0&this.hp<100){
			this.CND="HEALING";
		}
		if(this.gut>200){
			this.CND = "FULL";
		}
		if(this.gut<=0&this.energy<20){
			this.CND="HUNGRY";
		}
		if(this.gut<=0&this.hp<100){
			this.CND="DYING";
		}
		if(this.hp<=0&this.energy<=0){
			this.CND="DECEASED";
		}
	}


	//Draw textual information about blorb nearby.
	this.info = function(){
		var fontSize = 12
		var y = this.y-this.radius-fontSize;
		var r = Math.floor(this.radius)
		//Move text to left when on right of screen
		if(this.x<canvas.width/2){var x = this.x+this.radius+20;}
		else{var x = this.x-(this.radius)-120}
		c.fillStyle = "White";
		c.font = (fontSize+"px Lucida Console")
		var name = "Blorb: "+this.name+" ["+this.CND+"]";
		var energy = "Energy: "+Math.floor(this.energy);
		//var energy = "POS: "+this.x+' '+this.y;
		var hp = "Health: "+Math.floor(this.hp);
		var gut = "Gut: "+Math.floor(this.gut)+"% full"
		c.fillText(name,x,y)
		c.fillText(energy,x,y+fontSize)
		c.fillText(hp,x,y+(fontSize*2))
		c.fillText(gut,x,y+(fontSize*3))
	}

	//Blorb update logic
	this.update = function(time){
		if(this.arc>-2){this.draw();return;} //Let arc spin before beginning logic
		this.condition();
		this.sniff(time);
		this.roam(time);
		this.nomf(time);
		this.move();
		this.blorbCollide()
		this.metabolize(time);
		
		this.emitter.x = this.x;
		this.emitter.y = this.y;
		this.emitter.update();
		
		if (this.CND ==="DECEASED"){
			this.rot(time);
		}
		this.draw();
	};

	//Render blorb
	this.draw = function(){
		//Draw sniffSpheres
		if (this.CND!="DECEASED"){
			c.lineWidth = 2;
			c.strokeStyle = "rgba(255,255,255,"+this.sniffAlpha+")";
			c.beginPath();
			c.arc(this.x,this.y,this.sniffRadius,2*Math.PI,false);
			c.stroke();
		}

		this.fat();
		if (this.arc>-2){this.arc-=Math.random()*0.05}
		var f = this.fillClr;
		var s = this.strokeClr;
		c.fillStyle = "rgba("+this.fillClr.r+","+this.fillClr.g+","+this.fillClr.b+",1)";
		c.strokeStyle = "rgba("+this.strokeClr.r+","+this.strokeClr.g+","+this.strokeClr.b+",1)";
		c.lineWidth = this.membrane;
		c.beginPath();
		c.arc(this.x,this.y,this.radius,this.arc*Math.PI,false);
		if(this.arc<=-2){c.fill();}
		c.stroke();
	};
};




/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
					Edible Shrimp Prototype
		Blorbs love these! Each shrimp has a nutrition
		attribute that goes toward fueling blorb activity.
*/

shrimps = [];

var shrimp = function(x,y){
	this.x = x||canvas.width/2; this.y = y||canvas.height/2;
	this.nutrition = RNG(30,40,true); //Energy value provided
	this.width = 4;
	this.height = 4;
	this.px1 = Math.random()*10; this.py1 = Math.random()*10;
	this.px2 = Math.random()*10; this.py2 = Math.random()*10;
	this.vx = RNG(-1,1); this.vy = RNG(-1,1);
	this.vTimer = new Date().getTime();
	this.vInterval = RNG(400,600,true);
	this.tailX = this.x; this.tailY = this.y;
	this.color = "rgb(195,150,200)";
	this.tailColor = "rgb(207,87,87)";

	//Check for wall collisions and bounce
	this.wallCollide = function(){
		if (this.x>canvas.width-this.width){this.vx=0;this.x-=1;this.veloGet();};
		if (this.x<this.width){this.vx=0;this.x+=1;this.veloGet();}
		if (this.y>canvas.height-this.height){this.vy=0;this.y-=1;this.veloGet();};
		if (this.y<this.height){this.vy=0;this.y+=1;this.veloGet();}
	}
	
	//Get a new velocity for the scrimp
	this.veloGet = function(time){
		if(time<(this.vTimer+this.vInterval)){return};
		this.vTimer = time;
		var i = 0.08
		this.px1 += i;
		this.py1 += i;
		this.px2 += i;
		this.py2 += i;
		this.vx = noise.perlin2(this.px1,this.px2);
		this.vy = noise.perlin2(this.py1,this.py2);
	}
	
	//Update logic and draw ent
	this.update = function(time){
		this.veloGet(time);
		//Make tail follow shrimp
		this.tailX += (this.x - this.tailX)*0.2;
		this.tailY += (this.y - this.tailY)*0.2;
		this.wallCollide();
		//Increment velocity
		this.x += this.vx*2;
		this.y += this.vy*2;
		this.draw();
	}
	
	//Manages how ent is drawn
	this.draw = function(){
		//Draw connecting line
		c.strokeStyle = this.tailColor;
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(this.x,this.y);
		c.lineTo(this.tailX,this.tailY);
		c.stroke();
		//Draw Tail
		c.fillStyle = this.tailColor;
		c.fillRect(this.tailX-(this.width/4),this.tailY-(this.height/4),this.width/2,this.height/2)
		//Draw Body
		c.fillStyle = this.color;
		c.fillRect(this.x-(this.width/2),this.y-(this.height/2),this.width,this.height)
	}
	shrimps.push(this);
};

for (var i = 0; i < 20; i++) {
	new shrimp();
}


//Constantly keep shrimp spawned
shrimpSpawn = function(){
	if (shrimps.length<=5){
		for (var i = 0; shrimps.length < 20; i++) {
			new shrimp();
		};		
	};
};





/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
				Excrement Prototype
		Blorbs excrete these objects when they
		metabolize food shrimps into energy.
*/
poop = function(x,y,size){
	this.x = x;
	this.y = y;
	this.vx= 0;
	this.radius = size;
	this.baseAlpha = RNG(0.5,1);
	this.alpha= 0;
	this.outline = RNG(0.5,2)
	this.friction = RNG(0.05,0.1);

	this.update = function(){
		//Remove poop if 'decayed' or offscreen
		if (this.alpha<0 || this.x>canvas.width){
			poops.splice(poops.indexOf(this),1);
			return;
		}
		//Fade poop into existence
		//if(this.baseAlpha>this.alpha){
			this.alpha += (this.baseAlpha - this.alpha)*0.02
		//}
		
		//'Decay' poop by decrementing alpha
		this.baseAlpha-=0.001;
		//Apply (simple) friction and velocity to poops
		if(this.vx>0){
			this.x+=this.vx;
			this.vx-=this.friction;
		}
		//Set poop x velocity on collision with sweeper to allow sweeping.
		if(this.x<sweeper.x+sweeper.w&this.x>sweeper.x){
			this.vx = sweeper.speed+2;
		}
		this.draw();
	};

	this.draw = function(){
		c.fillStyle = "rgba(150,110,20,"+this.alpha+")";
		c.strokeStyle = "rgba(120,100,10,"+this.alpha+")";
		c.lineWidth = this.outline;
		c.beginPath();
		c.arc(this.x,this.y,this.radius,2*Math.PI,false);
		c.fill();
		c.stroke();		
	};
};


/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
				Sweeper Entity
		The sweeper is a bar that sweeps poops
		away as it passes across the screen.
*/
sweeper = function(){
	this.x = -10;
	this.speed = 5;
	this.w = 5;
	this.active = true;

	this.update = function(){
		if (mouse.rClick){
			this.x+=this.speed;
			this.draw();
		}
		if(this.x>canvas.width+10){this.x=-10;}
	}

	this.draw = function(){
		if(this.x<0){return};
		c.fillStyle= "rgba(255,255,255,0.25)"
		c.fillRect(this.x,0,this.w,canvas.height);

	}
}
sweeper = new sweeper();



/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
					Player
		Manages the input object that
		can place entities into Puddle
*/
player = function(){
	this.shrimpInterval = 100;
	this.spawnFlag = true;
	this.shrimpTimer = new Date().getTime();
	this.update = function(time){
		
		//left-Click to create shrimps
		if(mouse.lClick & time>this.shrimpTimer){
			this.shrimpTimer = time+this.shrimpInterval;
			if (shrimps.length<200){
				new shrimp(mouse.x,mouse.y);
			}
		}

		//Spawn a Blorb on middle-click; delimit to mouseDown
		if(mouse.mClick){
			if(this.spawnFlag & blorbs.length<50){blorbs.push(new blorb(mouse.x,mouse.y))}
			this.spawnFlag=false;
		}else{this.spawnFlag=true;}

		if(mouse.lrClick){
			//blorbs = [];
			shrimps = [];
		}
	}
};
player = new player();


/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
					PUDDLE SETUP
		Sets up the puddle with initialization 
		of globals and initial Blorb creation.
*/
blorbs = [];
shrimps = []
poops = [];

for (var i = 0; i < 20; i++) {
	blorbs.push(new blorb());
};



/*
					VISUAL FX
		Defines some fancy/necessary routines
		for painting to our canvas.
*/

//Draw puddle background
drawbG = function(){
    c.fillStyle= "rgba(50,50,100,0.6)";
    c.fillRect(0,0,canvas.width,canvas.height);
};

//Draw scanlines
scanLines = function(){
    for (line=1;line<=canvas.height;line+=2){
        c.fillStyle="rgba(0,0,100,0.1)";
        c.fillRect(0,line,canvas.width,1);
    }
}


/*__________________________________________________________________________________________________________________________________________________________________________________________________________________
					MAIN GAME UPDATE LOOP
			All magic called from this function
*/

puddleUpdate = function(){
	drawbG();
	shrimpSpawn();
	var time = new Date().getTime();

	// Update Sweeper entity
	sweeper.update();

	/*Update poops*/
	for (var i = poops.length - 1; i >= 0; i--) {
		var poop = poops[i];
		poop.update();
	};
	
	/*Update shrimps*/
	for (var i = 0; i < shrimps.length; i++) {
		shrimps[i].update(time);
	}

	/*Update Blorbs*/
	for (var i = blorbs.length - 1; i >= 0; i--) {
		var blorb = blorbs[i];
		blorb.update(time);

		// Draw info near cursor
		if(distance(blorb.x,blorb.y,mouse.x,mouse.y)<80){
			blorb.info();
			c.strokeStyle = "rgb(200,200,200)";
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(mouse.x,mouse.y);
			c.lineTo(blorb.x,blorb.y);
			c.stroke();
		}
	};


	//Update player mouse interaction
	player.update(time);
	
	scanLines();
};


setInterval(puddleUpdate,20);
canvas = document.createElement("canvas");
canvas.id = "segGame";
canvas.height=window.innerHeight;
canvas.width=window.innerWidth;
c = canvas.getContext("2d");
document.body.appendChild(canvas);



/*
	 Hello world message object.
	Returns an entity whose update()
	interps it to random screen coords
*/
msg = function(text){
	this.text = text||'Hello!';
	this.x = canvas.width/2;
	this.y = canvas.height/2;
	this.dx = Math.random()*canvas.width;
	this.dy = Math.random()*canvas.height;
	this.distance = 0;
	this.color = "rgb(255,255,255)";
	//Return dist between two points
	this.distance = function(x1,y1,x2,y2){
		var d = Math.sqrt(((x2-x1)^2)+((y1-y2)^2));
		return d;
	};
	//Randomizes the color string
	this.randColor = function(){
		var rNum = function(){return Math.floor(Math.random()*255)};
		this.color = "rgb("+rNum()+","+rNum()+","+rNum()+')';
	}
	//Call to update logic and draw ent
	this.update = function(){
		var dist = this.distance(this.x,this.y,this.dx,this.dy);
		if (dist<5){
			this.randColor();
			this.dx = Math.random()*canvas.width; 
			this.dy =  Math.random()*canvas.height;
		}
		this.x += (this.dx - this.x)*0.02;
		this.y += (this.dy - this.y)*0.02;
		this.draw();
	}
	//Manages how ent is drawn
	this.draw = function(){
		c.font = "20px Lucida Console"
		c.fillStyle = this.color;
		c.fillText(this.text,this.x,this.y);
	}	
};


hi = new msg();
info = new msg('This is a template for quick app synthesis!');


//Draw background
bG = function(){
    c.fillStyle= "rgba(10,10,20,1)";
    c.fillRect(0,0,canvas.width,canvas.height);
};

//Update display
update = function(){
	bG();
	hi.update();
	info.update();
};


setInterval(update,20);
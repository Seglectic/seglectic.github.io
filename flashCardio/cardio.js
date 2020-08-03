// █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
// █                                   █
// █      Flash Cardio                 █
// █                                   █
// █  Kanji Flashcard review system.   █
// █  Select current Kanji from RTK    █
// █  and show random cards from set.  █
// █                                   █
// █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
// 
// ╭────────────────────────────────────────────╮
// │  //TODO Should have earliest and last      │
// │  values to select from as well as ability  │
// │  to show reverse side instead of front.    │
// ╰────────────────────────────────────────────╯

/* ------------------------------------ Global vars ----------------------------------- */
var kanji       = [];		// Raw list of kanji
var kanjiDeck   = [];		// Array to hold kanji to display
var discardDeck = [];		// Hold seen kanji here when displayed
var textIndex   = 2;		// Which text div is currently displayed
var version     = 0.2;		// System version




/* ---------------------------------- Hotkey Controls --------------------------------- */

function cardKeys(e){ //Keybind to flip card
	console.log(e.keyCode)
	
	if(e.keyCode==82 || e.keyCode==17){
		$("#card").flip("toggle");
	}
	if(e.keyCode==32){
		randCard();
	}
}
addEventListener("keyup",cardKeys)


function kanjiGet(){ 	//Get kanji list from server
	var kanjiReq = new XMLHttpRequest();
	kanjiReq.open('GET', 'KanjiCards.txt');
	kanjiReq.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			kanji = kanjiReq.responseText.split('\n');
			console.log("Kanji retrieved from server")
			crunchKanji();
			randCard();
		}
	}
	kanjiReq.send();
}



function crunchKanji(){   // Process Kanji, iterate through each and add to deck
	for (let i = 0; i < kanji.length; i++) {
		var k = kanji[i];
		if(k.includes(",")){ 	//If line has ','; it's assumed to have a definition and should be added to card array
			k = k.split(',');
			kanjiDeck.push({front:k[0],back:k[1]})
		}
	}
}

function randomFlip(){ //Sets cards flip axis randomly
	var axis = 'x'
	var reverse = false;
	if(Math.random()>0.5){axis='y'}
	if(Math.random()>0.5){reverse=true}
	$("#card").flip({axis:axis,reverse:reverse});
}

function randCard(){ //Draw random card to display
	$(".cardFlash").fadeIn(20);
	var newCard = kanjiDeck[Math.floor(Math.random() * kanjiDeck.length)];
	if(textIndex==1){
		$("#cardFront2").fadeIn(50);
		$("#cardBack2").fadeIn(50);
		$("#cardFront1").fadeOut(250);
		$("#cardBack1").fadeOut(250);
		textIndex=2;
	}else{
		$("#cardFront1").fadeIn(50);
		$("#cardBack1").fadeIn(50);
		$("#cardFront2").fadeOut(250);
		$("#cardBack2").fadeOut(250);	
		textIndex=1;
	}
	document.getElementById(`cardFront${textIndex}`).innerHTML=newCard.front;
	document.getElementById(`cardBack${textIndex}`).innerHTML=newCard.back;
	$(".cardFlash").fadeOut(500);
	// randomFlip();
}

/* ------------------------------ Run when document ready ----------------------------- */
$( document ).ready(()=>{
	kanjiGet();
	var cardSettings = {             // Settings for flippable card
		axis:"x",
		trigger:"hover"
	}
	$("#card").flip({cardSettings}); // Create card object and apply settings object
	// console.log('meow')

	// Show version in corner
	// document.getElementById("footerRight")
	$("#footerRight").text(`Version ${version}`)
	$("#footerRight").fadeIn(1000);

})

var commandData = {
    viewers:[
        ['!sp',"Shows how many SP (Seglectic Points / Stream Power) you have"],
        ['!age','Show user age on Twitch.tv'],
        ['!discord','Display link to Discord channel'],
        ['!followage',"Shows how long you've been following"],
        ['!game',"Shows channel's current game/category"],
        ['!playtime',"Shows how long we've been playing the current game/category"],
        ['!quote',"Displays a random quote. Add {ID} number to display quote at that ID"],
    ],
    
    sfx:[
        ['!meow',"Plays a randomly pitched meow sound on stream.",'5sP'],
        ['!bark',"Plays a randomly pitched bark sound on stream.",'5sP'],
        ['!oof',"Plays a randomly pitched OOF sound on stream.",'10sP'],
        ['!bigoof',"Plays quite a big oof","80sP"],
    ],

    bot:[
        ['!bb/!bubble {sP}',"Deploys bubbles from bubbleBot, charges {sP} for more or less bubbles (Default: 25sP, Max 200sP, Min 10sP)"],
        ['!vape',"Sends vape"],
    ],

    mod:[
        ["!quoteadd {text}", "Adds new quote, be sure to include 'Username,' at the beginning of your quote"],
        ["!quotedel {ID}", "Deletes a quote at the specified ID"],
        ["!permit {username}", "Permits a twitch viewer to post a link for 60 seconds"],
    ],

}


//Creates a table from array data
function makeTable(array) {
    var table = document.createElement('table');
    for (var i = 0; i < array.length; i++) {
        var row = document.createElement('tr');
        for (var j = 0; j < array[i].length; j++) {
            var cell = document.createElement('td');
            cell.textContent = array[i][j];
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    return table;
}


document.getElementById("viewCommands").appendChild(makeTable(commandData.viewers));
document.getElementById("audioCommands").appendChild(makeTable(commandData.sfx));
document.getElementById("botCommands").appendChild(makeTable(commandData.bot));
document.getElementById("moderators").appendChild(makeTable(commandData.mod));



roboRandomQuotes = [
    'Beep boop wow!',
    'Beep boop meow!',
    'Beep boop!',
    'Commaaands~',
    "OwO What're these?",
    "BEEEEEEP",
    "UwU Commands",
    "Commands!",
    "BEeEP",
    "BeEeEeP",
    "Bop bip",
    "bEEP",
    "*beep* Hi!",
    "Waaaaaao",
]

roboRandom = function(){
    var rQuote = document.getElementById('roboQuote');
    rQuote.innerHTML = roboRandomQuotes[Math.floor(Math.random()*roboRandomQuotes.length)]
}
/**
 *                        roboCommands
 *          Contains command data for roboSeg
 *          edit these to update available commands
 *          for roboSeg. Add more segments in index.
 */


var commandData = {
    viewerCommands:[
        ['All Viewers'],
        ['!sp',"Shows how many SP (Seglectic Points / Stream Power) you have"],
        ['!age','Show user age on Twitch.tv'],
        ['!uptime','Shows how much time has passed since the current stream started'],
        ['!title','Shows the current stream title'],
        ['!game','Shows the current stream category (game, irl, etc)'],
        ['!discord','Display link to Discord channel'],
        ['!followage',"Shows how long you've been following"],
        ['!game',"Shows channel's current game/category"],
        ['!playtime',"Shows how long we've been playing the current game/category"],
        ['!quote',"Displays a random quote. Add {ID} number to display quote at that ID"],
        ['!lurk',"Notifies chat that you're around but not chatting with a random message"],
        ['!unlurk/!back',"Notifies chat that you're no longer lurking with a random message"],
    ],
    
    audioCommands:[
        ['Audio'],
        ['!meow',"Plays a randomly pitched meow sound on stream.",'5sP'],
        ['!bark',"Plays a randomly pitched bark sound on stream.",'5sP'],
        ['!oof',"Plays a randomly pitched OOF sound on stream.",'10sP'],
        ['!bigoof',"Plays quite the big oof","80sP"],
    ],

    botCommands:[
        ['Robots'],
        ['!bb/!bubble {sP}',"Deploys bubbles from bubbleBot, charges {sP} for more or less bubbles (Default: 25sP)","10-200sP"],
        ['!vape',"Sends blast of vape smoke at Seg via vapeBot [OFFLINE PENDING REBUILD]","100sP"],
        ['!hydrate?','Potential bot robot for watering Seg',''],
        ['!string?','Potential bot for firing silly string at Seg','']
    ],

    modCommands:[
        ['Moderators'],
        ["!settitle {title}","Updates the current stream title"],
        ['!setgame  {game}',"Updates the current stream category"],
        ["!quoteadd {text}", "Adds new quote, be sure to include 'Username,' at the beginning of your quote"],
        ["!quotedel {ID}", "Deletes a quote at the specified ID"],
        ["!permit {username}", "Permits a twitch viewer to post a link for 60 seconds"],
    ],
}

var roboQuotes = [
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
    "bEEp!",
    "*beep* Hi!",
    "Waaaaaao",
    "Neriiite~",
    "So many knowledges~",
    "You're the Man Now, Dog!",
    "Oh my beepness~",
    "Thanks for reading!",
    "Huh.",
    "So informative..",
]


//Creates a table from array data
makeTable = function(array) {
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

// Sets roboQuote element to a random quote from above
roboRandom = function(){
    var rQuote = document.getElementById('roboQuote');
    rQuote.innerHTML = roboQuotes[Math.floor(Math.random()*roboQuotes.length)]
}

let Secret = require('./token.js');
let Robot = require('robotjs');
let Discord = require('discord.js');
let Jsonfile = require('jsonfile');
const client = new Discord.Client();

const cfgFile = './config.json';
let gate = {};
Jsonfile.readFile(cfgFile)
    .then(obj => gate = obj)
    .catch(error => console.error(error));

// Dynamic structures
let commandsLeft = {};
let lastInteraction = {};
let participantTimers = {};
let lastResetRequestTime = 0;

// This object maps group types to functions that "execute" the command group
// (carry out the commands).
// It is very much the heart and soul of the program.
const execute = {
    combo: function(combo) {
        let keywords = combo.data.split('+');
        keywords = keywords.map(kw => kw.toLowerCase());
        keywords = keywords.map(kw => reduceKey(kw));

        for (const kw of keywords) {
            if (!(gate.StandardKeys.includes(kw) || 
                  gate.SpecialKeys.includes(kw)  ||
                  gate.ModifierKeys.includes(kw))) {
                throw new Error(`Attempted to press invalid key ${kw}.`);
            }
        }

        modifierKeys = keywords.filter(kw => gate.ModifierKeys.includes(kw));
        standardKeys = keywords.filter(kw => {
            return gate.StandardKeys.includes(kw) 
                || gate.SpecialKeys.includes(kw);
        });

        standardKeys.forEach(kw => Robot.keyTap(kw, modifierKeys));
    },
    special: function(special) {
        let key = special.data;

        if (!gate.SpecialKeys.includes(key)) {
            throw new Error('SOMETHING HAS GONE HORRIBLY, HORRIBLY WRONG.');
        }

        switch (key) {
          case 'click':
          case 'leftclick':
            Robot.mouseClick('left');
            break;
          case 'rightclick':
            Robot.mouseClick('right');
            break;
          case 'doubleclick':
          case 'doubleleftclick':
            Robot.mouseClick('left', true);
            break;
          case 'doublerightclick':
            Robot.mouseClick('right', true);
            break;
          default:
            Robot.keyTap(reduceKey(key));
            break;
        }
    },
    motion: function(motion) {
        tokens = motion.data;
        tokens = tokens.filter(token => token != undefined);
        if (tokens.length < 3) {
            throw new Error('TOO FEW ARGUMENTS TO MOVE COMMAND'
                + ` (${tokens.length - 1} PROVIDED, NEED 2)`);
        }

        let x = parseInt(tokens[1], 10);
        let y = parseInt(tokens[2], 10);

        let useDirection = gate.DirectionKeywords.includes(tokens[1]);
        let useCoordinates = !isNaN(x);
        if (isNaN(y)) {
            throw new Error(`BAD ARGUMENTS TO MOVE COMMAND: `
                + `${tokens[1]}, ${tokens[2]}`);
        }

        if (!(useDirection || useCoordinates)) {
            throw new Error(`BAD ARGUMENT TO MOVE COMMAND: ${tokens[1]}`);
        } else if (useDirection) {
            const amount = y;
            let curPos = Robot.getMousePos();
            let dest = {};
            switch (tokens[1]) {
              case 'left':
                dest.x = curPos.x - amount;
                dest.y = curPos.y;
                break;
              case 'right':
                dest.x = curPos.x + amount;
                dest.y = curPos.y
                break;
              case 'up':
                dest.x = curPos.x;
                dest.y = curPos.y - amount;
                break;
              case 'down':
                dest.x = curPos.x;
                dest.y = curPos.y + amount;
                break;
            }
            console.log(dest);
            if (!isInBounds(dest.x, dest.y)) {
                throw new Error(`POSITION `
                    + `(${dest.x - gate.originX}, `
                    + `${gate.vmHeight - (dest.y - gate.originY)}) `
                    + 'IS DISALLOWED: OUT OF BOUNDS');
            }
            if (tokens[0] === 'drag') {
                Robot.mouseToggle('down');
                Robot.dragMouse(dest.x, dest.y);
                Robot.mouseToggle('up');
            } else {
                Robot.moveMouse(dest.x, dest.y);
            }
        } else {
            let curPos = Robot.getMousePos();
            let dest = {};
            switch (tokens[0]) {
              case 'to':
                dest.x = gate.originX + x;
                dest.y = gate.vmHeight + gate.originY - y;
                break;
              case 'drag':
              case 'move':
                dest.x = curPos.x + x;
                dest.y = curPos.y - y;
                break;
            } 
            if (!isInBounds(dest.x, dest.y)) {
                throw new Error(`POSITION `
                    + `(${dest.x - gate.originX},`
                    + `${gate.vmHeight - (dest.y - gate.originY)}) `
                    + 'IS DISALLOWED: OUT OF BOUNDS.');
            }
            if (tokens[0] === 'drag') {
                Robot.mouseToggle('down');
                Robot.dragMouse(dest.x, dest.y);
                Robot.mouseToggle('up');
            } else {
                Robot.moveMouse(dest.x, dest.y);

            }
        }
    },
    generic: function(generic) {
        string = generic.data.join(' ');
        for (let i = 0; i < string.length; i < i++) {
            key = string.charAt(i);
            let holdShift = false;
            if (key != key.toLowerCase()) {
                holdShift = true;
                key = key.toLowerCase();
            }
            if (isShiftedSymbol(key)) {
                holdShift = true;
                key = gate.UnshiftForms[key];
            }
            Robot.keyTap(key, holdShift ? ['shift'] : []);
        }
    }
};


function reduceKey(word) {
    if (gate.ReducedForms[word] === undefined) {
        return word;
    }
    return gate.ReducedForms[word];
}

function isShiftedSymbol(chr) {
    return gate.UnshiftForms[chr] != undefined;
}

function handleMessage(message) {
    getGroups(message).forEach(group => execute[group.type](group));
}

function getGroups(message) {
    let groups = [];
    let tokens = message.split(" ");
    let genericChain = [];

    if (tokens[0].toLowerCase() == "type" && tokens.length > 1) {
        tokens.shift();
        return [{ data: tokens, type: 'generic' }];
    }

    while (tokens.length > 0) {
        const token = tokens.shift();

        if ((isComboToken(token) || 
             isMotionToken(token) ||
             isSpecialToken(token)) && 
             genericChain.length != 0) {
            groups.push({ data: genericChain, type: 'generic' });
            genericChain = [];
        }
        
        if (isComboToken(token)) {
            groups.push({ data: token, type: 'combo' });
        } else if (isMotionToken(token)) {
            groups.push({ data: [token, tokens.shift(), tokens.shift()], 
                type: 'motion' });
        } else if (isSpecialToken(token)) {
            // If this and the next token are clicks, we need to send them both
            // as a double click directive.
            if (gate.MouseClicks.includes(token) && token == tokens[1]) {
                groups.push({ data: 'double' + token, type: 'special' });
            } else { 
                groups.push({ data: token, type: 'special' });
            }
        } else {
            genericChain.push(token);
        }
    }

    if (genericChain.length > 0) {
        groups.push({ data: genericChain, type: 'generic' });
    }
    return groups;
}

function isComboToken(token) {
    const comboPattern = /^([a-z]+)(\+([a-z]+))+$/gi;
    return comboPattern.test(token);
}

function isMotionToken(token) {
    return gate.MotionKeywords.includes(token);
}

function isSpecialToken(token) {
    return gate.SpecialKeys.includes(token.toLowerCase()) 
        && !token.startsWith('\\');
}

function isInBounds(x, y) {
    console.log(`${x}, ${y}`);
    return x >= gate.originX && y >= gate.originY && 
        (x <= gate.originX + gate.vmWidth) && (y <= gate.originY + gate.vmHeight);
}

function updateParticipation(dsUser) {
    dsUser.roles.add(gate.participantRole);
    lastInteraction[dsUser.id] = Date.now();
    clearTimeout(participantTimers[dsUser.id]);
    participantTimers[dsUser.id] = setTimeout(() => {
        dsUser.roles.remove(gate.participantRole);
    }, gate.msParticipantRoleLifetime);
}

// Send a message notifying failure of a command.
function notifyFailure(usCommand, dsUser, msg, dsChannel) {
    let username = dsUser.username.toUpperCase();
    dsChannel.send(`\`\`\`FAILURE.\n` 
        + `[${Date.now()}] INCORRECT DIRECTIVE FROM ${username}.\n`
        + `[${Date.now()}] " ${usCommand} " : ${msg}\`\`\``);
}

function startResetVote(dsChannel) {
    dsChannel.send(gate.resetVoteMessage)
        .then((msg) => { 
            Promise.all([ msg.react('✔️'), msg.react('❌') ]);
            setTimeout(() => {
                let yesCount = msg.reactions.cache.get('✔️').count;
                let noCount = msg.reactions.cache.get('❌').count;
                if (yesCount > noCount) {
                    resetMachine();
                    dsChannel.send('Vote passed. Resetting machine.');
                } else {
                    dsChannel.send('Vote failed. Machine will not be reset.');
                }
            }, gate.resetVoteTime);
        })
        .catch(console.error);
    lastResetRequestTime = Date.now();
}

function resetMachine() {
    console.log('resetting...');
}

client.once('ready', () => {
    console.log(`Gate opened as ${client.user.tag}`);
});

client.on('message', message => {
    // Must not be a message from the gatebot itself!
    if (client.user.id === message.author.id) {
        return;
    }

    // Check for control messages 
    if (message.channel.name === gate.nameControlChannel) {
        try {
            handleMessage(message.content);
            updateParticipation(message.member);
        } catch (e) {
            notifyFailure(
                message.content, message.author, e.message, message.channel);
        }
    } else if (message.channel.name === gate.nameResetChannel) {
        if (message.content === gate.resetKeyword) {
            startResetVote(message.channel);
        }
    }
});

client.login(Secret.token);


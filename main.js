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
// Yes, global variables, yada yada sue me etc.
let commandsLeft = {};
let lastInteraction = {};
let participantTimers = {};
let participants = [];
let lastResetRequestTime = 0;
let canRecieveCommands = true;

// This object maps group types to functions that "execute" the command group
// (carry out the commands).
// It is very much the heart and soul of the program.
const execute = {
    combo: function(combo, dsUser) {
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

        modifierKeys.sort();
        // If we tried to press ctrl+alt+delete, send ctrl+del instead.
        // This sends a ctrl+alt+del to the vm.
        if (modifierKeys[0] === 'alt', modifierKeys[1] === 'control', 
            standardKeys[0] === 'delete') {
            Robot.keyTap('f7', ['delete']);
            return;
        }
        
        if (standardKeys.length != 0) {
            standardKeys.forEach(kw => {
                deductAllowance(dsUser, 1);
                Robot.keyTap(kw, modifierKeys);
            });
        } else {
            Robot.keyTap(modifierKeys[0], modifierKeys);
        }
    },
    special: function(special, dsUser) {
        let key = special.data;

        if (!gate.SpecialKeys.includes(key)) {
            throw new Error('SOMETHING HAS GONE HORRIBLY, HORRIBLY WRONG.');
        }

        switch (key) {
          case 'click':
          case 'leftclick':
            deductAllowance(dsUser, 1);
            Robot.mouseClick('left');
            break;
          case 'rightclick':
            deductAllowance(dsUser, 1);
            Robot.mouseClick('right');
            break;
          case 'doubleclick':
          case 'doubleleftclick':
            deductAllowance(dsUser, 1);
            Robot.mouseClick('left', true);
            break;
          case 'doublerightclick':
            deductAllowance(dsUser, 1);
            Robot.mouseClick('right', true);
            break;
          default:
            deductAllowance(dsUser, 1);
            Robot.keyTap(reduceKey(key));
            break;
        }
    },
    motion: function(motion, dsUser) {
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
                deductAllowance(dsUser, 3);
                Robot.mouseToggle('down');
                Robot.dragMouse(dest.x, dest.y);
                Robot.mouseToggle('up');
            } else {
                deductAllowance(dsUser, 1);
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
                deductAllowance(dsUser, 3);
                Robot.mouseToggle('down');
                Robot.dragMouse(dest.x, dest.y);
                Robot.mouseToggle('up');
            } else {
                deductAllowance(dsUser, 1);
                Robot.moveMouse(dest.x, dest.y);
            }
        }
    },
    generic: function(generic, dsUser) {
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
            deductAllowance(dsUser, 1);
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

function handleMessage(message, dsUser) {
    getGroups(message).forEach(group => execute[group.type](group, dsUser));
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
            // (The next token is tokens[0], since we popped off the first one
            // at the top of the function).
            if (gate.MouseClicks.includes(token) && token === tokens[0]) {
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
    const comboPattern = /^([a-zA-Z0-9]+)(\+([a-zA-Z0-9]+))+$/gi;
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
    return x >= gate.originX && y >= gate.originY
        && (x <= gate.originX + gate.vmWidth) 
        && (y <= gate.originY + gate.vmHeight);
}

function updateParticipation(dsUser) {
    log(`Updating participation for user ${dsUser.displayName}.`);

    // If this user isn't already in the participants list...
    if (!participants.some(u => u.id == dsUser.id)) {
        participants.push(dsUser);
        commandsLeft[dsUser.id] = gate.maxCommandAllowance;
        log(`Added new user ${dsUser.displayName} to participants list.`);
        log(`List is now:`);
        participants.forEach(p => log(`${p.id} : ${p.displayName}`));
    }
    dsUser.roles.add(gate.participantRole);
    lastInteraction[dsUser.id] = Date.now();

    clearTimeout(participantTimers[dsUser.id]);
    participantTimers[dsUser.id] = setTimeout(() => {
        dsUser.roles.remove(gate.participantRole);
        log(`User ${dsUser.displayName} did not interact for 2 hrs: `
            + `removed participant role.`);
        participants = participants.filter(p => p.id != dsUser.id);
    }, gate.msParticipantRoleLifetime);
}

function addToAllAllowances(amount) {
    participants.forEach(p => {
        commandsLeft[p.id] += amount;
        if (commandsLeft[p.id] > gate.maxCommandAllowance) {
            commandsLeft[p.id] = gate.maxCommandAllowance;
        }
    });
}

function deductAllowance(dsUser, amount) {
    if (commandsLeft[dsUser.id] - amount < 0) {
        throw new Error(`You are inputting too many commands. `
            + `Wait a few seconds.`);
    }
    commandsLeft[dsUser.id] -= amount;
}

// Send a message notifying failure of a command.
function notifyFailure(usCommand, dsUser, msg, dsChannel) {
    let username = dsUser.displayName.toUpperCase();
    dsChannel.send(`\`\`\`FAILURE.\n` 
        + `[${Date.now()}] INCORRECT DIRECTIVE FROM ${username}.\n`
        + `[${Date.now()}] " ${usCommand} " : ${msg}\`\`\``);
}

function startResetVote(dsChannel) {
    log(`A reset vote was started.`);
    dsChannel.send(gate.resetVoteMessage)
        .then((msg) => { 
            Promise.all([ msg.react('✔️'), msg.react('❌') ]);
            setTimeout(() => {
                let yesCount = msg.reactions.cache.get('✔️').count;
                let noCount = msg.reactions.cache.get('❌').count;
                if (yesCount > noCount) {
                    dsChannel.send('`Vote passed. Resetting machine.`');
                    log(`A reset vote passed with ${yesCount} for and `
                        + `${noCount} against.`);
                    resetMachine();
                } else {
                    dsChannel.send('`Vote failed. Machine will not be reset.`');
                    log(`A reset vote failed with ${yesCount} for and `
                        + `${noCount} against.`);
                }
            }, gate.resetVoteTime);
            setTimeout(() => {
                dsChannel.send('`Vote is about to close.`');
            }, gate.resetVoteTime * 0.8);
        })
        .catch(console.error);
    lastResetRequestTime = Date.now();
}

// J   N    C   T
//   A   K    I   Y
function resetMachine() {
    log(`Machine is resetting...`);
    canRecieveCommands = false;
    log(`Gatebot is no longer accepting commands.`);

    // Mouse the mouse into the powershell console and type the reset script.
    Robot.moveMouse(1500, 700);
    log(`Attempted to move mouse to powershell prompt.`);
    Robot.mouseClick('left');
    for (let i = 0; i < gate.psResetCommand.length; i++) {
        Robot.keyTap(gate.psResetCommand.charAt(i));
    }
    Robot.keyTap('enter');
    log(`Attempted to run reset script.`);

    // After waiting 20 seconds for the script to finish, move the mouse to the
    // "Go Live" button, click, and then move the mouse to where we *hope to
    // god* the option for the VM window is.
    setTimeout(() => {
        Robot.moveMouse(245, 940);
	    Robot.mouseClick('left');
        log(`Attempted to click "go live" button.`);
        setTimeout(() => {
            Robot.moveMouse(350, 940);
	        Robot.mouseClick('left');
            log(`Attempted to choose VM for streaming.`);
            setTimeout(() => {
                Robot.moveMouse(600, 940);
                Robot.mouseClick('left');
                log(`Attempted to click "start streaming" button.`);
                Robot.moveMouse(gate.originX + 10, gate.originY + 10);
                Robot.mouseClick('left');
                canRecieveCommands = true;
                log(`Attempted to refocus VM.`);
                log(`Gatebot is now accepting commands.`);
            }, 1000);
        }, 1000);
    }, 20 * 1000);
}

function log(msg) {
    console.log(`${new Date()} : ${msg}`);
}

client.once('ready', () => {
    log(`Gate opened as ${client.user.tag}`);

    setInterval(() => {
        addToAllAllowances(gate.commandAllowanceIncrement);
    }, gate.msCommandAllowanceRefreshTime)
});

client.on('message', message => {
    // Must not be a message from the gatebot itself!
    if (client.user.id === message.author.id) {
        return;
    }

    // Check for control messages 
    if (message.channel.name === gate.nameControlChannel) {
        if (!canRecieveCommands) {
            notifyFailure(
                message.content, message.member, 
                `THE GATE IS NOT ACCEPTING COMMANDS AT THIS TIME.`,
                message.channel);
            log(`Recieved command ${message.content} when gatebot has commands `
                + `disabled.`);
            return;
        }
        try {
            handleMessage(message.content, message.member);
            updateParticipation(message.member);
            log(`Caught command from ${message.member.displayName}.`);
            for (p in commandsLeft) {
                log(`commandsLeft[${p}] = ${commandsLeft[p]}`);
            }
        } catch (e) {
            notifyFailure(
                message.content, message.member, e.message.toUpperCase(), 
                message.channel);
        }
    } else if (message.channel.name === gate.nameResetChannel) {
        if (message.content === gate.resetKeyword) {
            if (Date.now() - lastResetRequestTime < gate.resetVoteCooldown) {
                message.channel.send('`You cannot call another vote yet.`');
            } else {
                startResetVote(message.channel);
            }
            message.delete().catch(console.error);
        } else {
            message.channel.send('`Say "__RESET" to start a vote.`');
            message.delete().catch(console.error);
        }
    }
});

client.login(Secret.token);


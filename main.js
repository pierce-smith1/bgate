
let secret = require('./token.js');
let Robot = require('robotjs');
let Discord = require('discord.js');
const client = new Discord.Client();

const StandardKeys = [
    '`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'q', 'w',
    'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'a', 's', 'd', 'f',
    'g', 'h', 'j', 'k', 'l', ';', '\'', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',',
    '.', ' '
];

const ModifierKeys = [
    'control',
    'command',
    'alt',
    'shift'
];

const MouseClicks = [
    'click',
    'leftclick',
    'rightclick',
    'doubleclick',
    'doubleleftclick',
    'doublerightclick'
];

const SpecialKeys = [
    'tab',
    'space',
    'left',
    'right',
    'down',
    'up',
    'del',
    'delete',
    'backspace',
    'back',
    'pgup',
    'pageup',
    'pgdn',
    'pgdown',
    'pagedown',
    'enter',
    'escape',
    'esc',
].concat(ModifierKeys).concat(MouseClicks);

const MotionKeywords = [
    'to',
    'move',
    'drag'
];

const DirectionKeywords = [
    'left',
    'right',
    'up',
    'down'
];

// A mapping of keywords and symbols to their robotjs compatible versions.
const ReducedForms = {
    win: 'command',
    windows: 'command',
    ctrl: 'control',
    esc: 'escape',
    pgup: 'pageup',
    pgdn: 'pagedown',
    pgdown: 'pagedown',
    back: 'backspace',
};

const UnshiftForms = {
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    '_': '-',
    '+': '=',
    '{': '[',
    '}': ']',
    '|': '\\',
    ':': ';',
    '"': '\'',
    '<': ',',
    '>': '.',
    '?': '/',
    '~': '`'
}

const originX = 64 + 1;
const originY = 64 + 1;
const vmWidth = 800 - 2;
const vmHeight = 600 - 2;
const commandAllowance = 5;
const msAllowanceResetTime = 30000;
const nameControlChannel = 'gate-control';

const execute = {
    combo: function(combo) {
        let keywords = combo.data.split('+');
        keywords = keywords.map(kw => kw.toLowerCase());
        keywords = keywords.map(kw => reduceKey(kw));

        for (const kw of keywords) {
            if (!(StandardKeys.includes(kw) || 
                  SpecialKeys.includes(kw)  ||
                  ModifierKeys.includes(kw))) {
                throw new Error(`Attempted to press invalid key ${kw}.`);
            }
        }

        modifierKeys = keywords.filter(kw => ModifierKeys.includes(kw));
        standardKeys = keywords.filter(kw => {
            return StandardKeys.includes(kw) || SpecialKeys.includes(kw);
        });

        standardKeys.forEach(kw => Robot.keyTap(kw, modifierKeys));
    },
    special: function(special) {
        let key = special.data;

        if (!SpecialKeys.includes(key)) {
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

        let useDirection = DirectionKeywords.includes(tokens[1]);
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
                    + `(${dest.x - originX}, ${vmHeight - (dest.y - originY)}) `
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
                dest.x = originX + x;
                dest.y = vmHeight + originY - y;
                break;
              case 'drag':
              case 'move':
                dest.x = curPos.x + x;
                dest.y = curPos.y - y;
                break;
            } 
            if (!isInBounds(dest.x, dest.y)) {
                throw new Error(`POSITION `
                    + `(${dest.x - originX}, ${vmHeight - (dest.y - originY)}) `
                    + 'IS DISALLOWED: OUT OF BOUNDS.');
            }
            if (tokens[0] === 'drag') {
                Robot.dragMouse(dest.x, dest.y);
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
                key = UnshiftForms[key];
            }
            Robot.keyTap(key, holdShift ? ['shift'] : []);
        }
    }
};


function reduceKey(word) {
    if (ReducedForms[word] === undefined) {
        return word;
    }
    return ReducedForms[word];
}

function isShiftedSymbol(chr) {
    return UnshiftForms[chr] != undefined;
}

function handleMessage(message) {
    getGroups(message).forEach(group => execute[group.type](group));
}

function getGroups(message) {
    let groups = [];
    let tokens = message.split(" ");
    let genericChain = [];

    if (tokens[0].toLowerCase() == "type") {
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
            if (MouseClicks.includes(token) && token == tokens[1]) {
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
    return MotionKeywords.includes(token);
}

function isSpecialToken(token) {
    return SpecialKeys.includes(token.toLowerCase()) && !token.startsWith('\\');
}

function isInBounds(x, y) {
    console.log(`${x}, ${y}`);
    return x >= originX && y >= originY && 
        (x <= originX + vmWidth) && (y <= originY + vmHeight);
}

// Send a message notifying failure of a command.
function notifyFailure(usCommand, dsUser, msg, dsChannel) {
    let user = dsUser.username.toUpperCase();
    dsChannel.send(`\`FAILURE.\n` 
        + `[${Date.now()}] INCORRECT DIRECTIVE FROM ${user}.\n`
        + `[${Date.now()}] " ${usCommand} " : ${msg}\``);
}

client.once('ready', () => {
    console.log(`Gate opened as ${client.user.tag}`);
});

client.on('message', message => {
    // Must not be a message from the gatebot itself!
    if (client.user.id === message.author.id) {
        return;
    }

    // Must be in #gate-control
    if (message.channel.name === nameControlChannel) {
        try {
            handleMessage(message.content);
        } catch (e) {
            notifyFailure(
                message.content, message.author, e.message, message.channel);
        }
    } else {
        log(`caught message not in ${nameControlChannel}; ignoring.`);
    }
});

client.login(secret.token);


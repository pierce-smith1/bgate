
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
    'click',
    'leftclick',
    'rightclick'
].concat(ModifierKeys);

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

const originX = 64;
const originY = 64;
const vmWidth = 800;
const vmHeight = 600;
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
        key = special.data.toLowerCase();
        if (!SpecialKeys.includes(key)) {
            throw new Error('Something has gone horribly, horribly wrong.');
        }

        switch (key) {
          case 'click':
          case 'leftclick':
            Robot.mouseClick('left');
            break;
          case 'rightclick':
            Robot.mouseClick('right');
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
            throw new Error('Too few arguments to mouse move command. '
                + `(${tokens.length})`);
        }

        let x = parseInt(tokens[1], 10);
        let y = parseInt(tokens[2], 10);

        let useDirection = DirectionKeywords.includes(tokens[1]);
        let useCoordinates = !isNaN(x);
        if (isNaN(y)) {
            throw new Error(`Cannot move mouse by "${tokens[2]}" pixels.`);
        }

        if (!(useDirection || useCoordinates)) {
            throw new Error(`Bad argument ${tokens[1]} to mouse move `
                + `command.`);
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
                throw new Error(`Cannot move to `
                    + `(${dest.x - originX}, ${dest.y - originY}) `
                    + ': Out of bounds.');
            }
            if (tokens[0] === 'drag') {
                Robot.dragMouse(dest.x, dest.y);
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
                throw new Error(`Cannot move to `
                    + `(${dest.x - originX}, ${dest.y - originY}) `
                    + ': Out of bounds.');
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
            groups.push({ data: token, type: 'special' });
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
    return x >= originX && y >= originY && 
        (x <= originX + vmWidth) && (y <= originY + vmHeight);
}

// Send a message notifying failure of a command.
function notifyFailure(usCommand, dsUser, msg, dsChannel) {
    dsChannel.send(`Error on \`${usCommand}\`: ${msg}`);
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


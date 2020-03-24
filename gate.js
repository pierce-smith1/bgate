// m.p.

// Token obfuscation
const secret = require('./token.js');

// Mouse/keyboard tools
const Robot = require("robotjs");

// Discord bot
const Discord = require('discord.js');
const client = new Discord.Client();

// Global constants
const pOriginX = 64;
const pOriginY = 64;
const vmWidth = 800;
const vmHeight = 600;
const commandAllowance = 5;
const msAllowanceResetTime = 30000;
const nameControlChannel = 'gate-control';

const commandTypes = ['key', 'mouseClick', 'mouseTo', 'mouseMove']
const commandKeywords = {
    key: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '`', '1',
'2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '[', ']', '\\', ';',
'\'', ',', '.', '/', 'tab', 'space', 'left', 'right', 'down', 'up', 'windows',
'win', 'ctrl', 'alt', 'shift', 'del', 'delete', 'backspace',
'pgup', 'pageup', 'pgdn', 'pgdown', 'pagedown', 'control', 'esc'],
    mouseClick: ['leftclick', 'click', 'rightclick'],
    mouseTo: ['to'],
    mouseMove: ['move']
};

const modifyingKeys = ['control', 'alt', 'command', 'shift'];

// An associative array that takes in the name of a key and reduces it to a form
// usable by robotjs.
// If there is no entry in the object, it doesn't have to be reduced.
const reducedKeyForm = {
    win: 'command',
    windows: 'command',
    ctrl: 'control',
    esc: 'escape',
    pgup: 'pageup',
    pgdn: 'pagedown',
    pgdown: 'pagedown',
}

function reduce(key) {
    if (reducedKeyForm[key] === undefined) {
        return key;
    }
    return reducedKeyForm[key];
}

const verifyCommand = {
    key: function(usArgs) {
        let invalidArgs = usArgs.filter(a => !commandKeywords.key.includes(a));
        if (invalidArgs.length > 0) {
            throw new Error(`Attempted to press invalid key(s) ${invalidArgs}`);
        }
    },
    mouseClick: function(usArgs) {
        if (usArgs.length > 2) {
            throw new Error('Cannot ask for more than two ' +
                'simulatneous clicks.');
        }
        let invalidArgs = 
            usArgs.filter(a => !commandKeywords.mouseClick.includes(a));

        if (invalidArgs.length > 0) {
            throw new Error(
                `Attempted to click invalid button(s) ${invalidArgs}`);
        }
    },
    mouseTo: function(usArgs) {
        if (usArgs.length < 3) {
            throw new Error('A minimum of two coordinates are needed to ' +
                'move the mouse.');
        } else if (usArgs.length > 3) {
            throw new Error('Too many coordinates (specify exactly two)');
        }

        let destination = parseCoordinates(usArgs[1], usArgs[2]);

        if (isOutOfBounds(destination[0], destination[1])) {
            throw new Error(`Cannot move mouse to (${destination[0]}, ` +
                `${destination[1]}), since it is outside the screen.`);
        }
    },
    mouseMove: function(usArgs) {
        if (usArgs.length < 3) {
            throw new Error('A minimum of two coordinates are needed to .' +
                'move the mouse.');
        } else if (usArgs.length > 3) {
            throw new Error('Too many offsets (specify exactly two)');
        }

        let offset = parseCoordinates(usArgs[1], usArgs[2]);
        let currMousePos = Robot.getMousePos();
        let destination = [offset[0] + currMousePos.x,  
            offset[1] + currMousePos.y];

        if (isOutOfBounds(destination[0], destination[1])) {
            throw new Error(`Cannot move mouse to (${destination[0]}, `
                + `${destination[1]}), since it is outside the screen.`);
        }
    }
}

function parseCoordinates(usX, usY) {
    const x = parseInt(usX, 10);
    const y = parseInt(usY, 10);

    if (isNaN(x)) {
        throw new Error(`\`${x}\` is not a valid x coordinate.`);
    }
    if (isNaN(y)) {
        throw new Error(`\`${y}\` is not a valid y coordinate.`);
    }

    return [x, y];
}

const executeCommand = {
    key: function(sArgs, idUser) {
        modifiers = sArgs.filter(arg => modifyingKeys.includes(arg));
        keys = sArgs.filter(arg => !modifyingKeys.includes(arg));
        keys.map(key => {
            Robot.keyTap(key, modifiers)
        });
    },
    mouseClick: function(sArgs, idUser) {
        doDoubleClick = sArgs.length > 1;
        switch (arg) {
          case 'leftclick':
          case 'click':
            Robot.mouseClick(left, doDoubleClick);
          case 'rightclick':
            Robot.mouseClick(right, doDoubleClick);
        }
    },
    mouseTo: function(sArgs, idUser) {
        Robot.moveMouse(parseInt(sArgs[1], 10), parseInt(sArgs[2], 10));
    },
    mouseMove: function(sArgs, idUser) {
        currMousePos = getMousePos();
        Robot.moveMouse(currMousePos.x + sArgs[1], currMousePos.y + sArgs[2]);
    }
}

const msgMalformedCommand = 'Bad command syntax.';

// Data structures

// Keys are user ids, values are the amount of commands they have left.
remainingCommands = {};

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
            handleCommand(message);
        } catch (e) {
            notifyFailure(
                message.content, message.author, e.message, message.channel);
            log(`Command ${message.content} by ${message.author.name} failed.`);
        }
    } else {
        log(`caught message not in ${nameControlChannel}; ignoring.`);
    }
});

client.login(secret.token);

// Perform the correct function based on the incoming command.
function handleCommand(dsMessage) {
    args = dsMessage.content.split(/[ +]/);
    commandType = getCommandType(args);
    if (commandType === undefined) {
        throw new Error('Unknown command.');
    }
    executeCommand[commandType](args, dsMessage.author.id);
}

// Determines what kind of command the given command could be.
// Commands are guaranteed to be safe after this function is called. An
// exception will be thrown on any failure to determine the command type.
function getCommandType(usArgs) {
    for (const commandType of commandTypes) {
        if (commandKeywords[commandType].includes(usArgs[0])) {
            verifyCommand[commandType](usArgs);
            return commandType;
        }
    }
    return undefined;
}

// Send a message notifying failure of a command.
function notifyFailure(usCommand, dsUser, msg, dsChannel) {
    dsChannel.send(`${dsUser.username} failed. \`${usCommand}\` is not ` + 
        `an acceptable command: \`${msg}\``);
}

// Returns if the given position is outside the bounds of the vm screen.
function isOutOfBounds(px, py) {
    return px < 0 || py < 0 || px > vmWidth || py > vmHeight;
}

// Mark a user as a participant of the game.
function makeParticipant(idUser) {

}

// Reset the mouse to its default position.
function resetMouse() {
}

function log(msg) {
    console.log(msg);
}

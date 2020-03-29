# The Billy Gate

The Stratzenblitz Discord's official April Fools 2020 event.

## Summary

Users on the Stratzenblitz Discord, for 7 days starting at 4:00 am UTC on April
1st, 2020, will gain access to a category of channels labelled `THE BILLY GATE`.
Through these channels, users will be able to control a virtual machine running
Windows XP SP2 (a.k.a the "vm") by inputting commands read by a bot (a.k.a the
"gatebot"). Users will have full mouse and keyboard control of the machine
through these commands, but they will be limited in the amount of commands they
are able to input in a certain time frame.

This virtual machine will be streamed by a separate account (a.k.a. the
"streamer"), so users can see their actions take place.

## Discord Channels

Four channels will be added to the server, each placed in a new category
labelled `THE BILLY GATE`. Three of these channels will be publicly accessible
to all Members - one will be restricted to participants of the game.

- #gate-chat: For discussion about the Gate. We provide this as a space for
  people to coordinate activities if they wish. The bot will NOT read messages
  in this channel.
- #gate-control: The channel by which the users can control the VM. **EVERY
  MESSAGE SENT IN THIS CHANNEL WILL BE INTERPRETED AS A COMMAND BY THE
  GATEBOT.** There is no prefix necessary to get the gatebot's attention.
- #gate-reset: This channel is restricted to participants. In this channel,
  participants can call and vote for a reset of the virtual machine.
- The Gate: The voice channel through which the streamer will stream the virtual
  machine. Full voice chat and streaming capabilities will remain open to all
  users in the channel, but the streamer should not be muted.

## Interaction

Users will interact with the Billy Gate through the `#gate-control` channel.
Every message sent in this channel is interpreted as a command to the gatebot.

Each command is one of the following:

- Pressing a single key on the vm's keyboard
- Moving the mouse to a space on the vm
- Clicking the mouse in the vm

After a successful command is sent, the gatebot will process the command.  If an
unsuccessful command is sent, the gatebot will respond, citing the command that
was attempted, the user that requested it, and why it failed. (Some reasons a
command might fail are invalid syntax, insufficient command allowance, invalid
arguments, etc.)

After sending a command, whether it succeeded or failed, the user that sent it
becomes a participant of the game. This grants them a special role. If they do
not send another command within two hours, this participant role is removed.

### Keyboard interaction

There are two basic modes of keyboard interaction - *typing* and *comboing*.
Multiple modes can be used in the same message, and the gatebot will
intelligently determine which mode is desired by examining the syntax of the
message.

#### Typing mode

The simplest mode is typing mode. In this mode, the gatebot takes its input and
interprets it as a literal string, typing each character in the string to the
keyboard in sequence. All characters are preserved, including spaces. For
instance, if the gatebot receives the message "hello world ", it will type `h`
`e` `l` `l` `o` ` ` `w` `o` `r` `l` `d` ` `, preserving all of the spaces.

Typing mode can be interrupted by one of the following special keywords:

- `tab`
- `space`
- `left`
- `right`
- `down`
- `up`
- `windows` | `win` 
- `ctrl` | `control`
- `alt`
- `shift`
- `del` | `delete`
- `backspace`
- `pgup` | `pageup`
- `pgdn` | `pgdown` | `pagedown`
- `enter`
- `escape` | `esc`

If one of these are encountered, the gatebot will press the corresponding key
(i.e. the "escape" key for `esc`) instead of typing out the sequence of
characters. The gatebot will only interpret these special codes if they appear
on their own as a complete token; for instance, "deleteme" will simply type out
`d` `e` `l` `e` `t` `e` `m` `e`, but "delete me" will press the delete key and
then type `m` `e`.

The following keywords will also interrupt typing mode by invoking mouse
interaction:

- `click` | `leftclick`
- `rightclick`
- `doubleclick` | `doubleleftclick`
- `doublerightclick`
- `to`
- `move`
- `drag`

These will not press keys on the keyboard at all.

To type out one of these special words without it being re-interpreted, preface
the command with `type`. If a command begins with `type`, typing mode stays on
for the rest of the command and it cannot be interrupted by special sequences.
For instance, `type pgup click` presses `p` `g` `u` `p` ` ` `c` `l` `i` `c` `k`
instead of pressing pageup and clicking the mouse.

#### Combo mode

Combo mode allows multiple keys to be pressed at the same time.

Combo mode is invoked with a `+` separated list of keys. At least one of the
keys must be a *modifier* key, which is one of the following: 

- `shift`
- `alt`
- `windows` | `win`
- `ctrl` | `control`

The other keys must be standard keyboard keys, such as `a`, `0`, `.`, etc.

We define a *combo query* as one of these complete lists. Some combo queries
could be `ctrl+s` or `ctrl+shift+escape` or `z+alt`. When
the gatebot recognizes a combo query, it interrupts typing mode. It then holds
the given modifier key while pressing the other standard keys.

### Mouse interaction

Users are able to move the vm's mouse relatively and absolutely, as well as
click both its left and right buttons.

To move the mouse to an *absolute* position, send `to x y`, where `x` and
`y` are the x and y coordinates in pixels of the new position. (0, 0) is defined
as the **bottom left** corner of the screen, as most people would expect.

If either x or y is out of bounds for the vm's screen, the command fails.

Users can also move the mouse relatively. To do so, send `move x y`, where
x is how far (in pixels) to move the mouse right and y is how far (in pixels) to
move the mouse up. If the mouse's new position would go out of the vm's screen,
the command fails.

The mouse can also be moved by specifying a direction and an amount of pixels. 
Users can send `move left x`, `move right x`, `move down x`, or `move up x`,
where `x` is the number of pixels to move. Negative numbers are not allowed
here.

If `move` is replaced with `drag` in any of the above commands, the mouse moves
to its new location *while holding the left mouse button*.

To left-click the vm's mouse, send `click` or `leftclick`. To right-click the
vm's mouse, send `rightclick`. Any of these mouse commands can be prefixed with
`double` to perform a double-click. They can also just be typed twice, as in
`click click` for a double left-click.

Scrolling the mouse is not supported. Users should use `pgup` and `pgdown`
instead.

### Command limitations

The amount of commands a user can send is limited by time.

A command includes any *atomic* action that influences the VM, including moving
the mouse, clicking the mouse, or pressing a single key. For instance, `ctrl+z`
is two commands, pressing `ctrl` and pressing `z`. `typing stuff` would be 12
commands, one for each button pressed.

Each user has a command allowance. The maximum amount of commands any user can
have in their allowance is 30. Every second, 3 commands are added to every
user's allowance. 

### Resetting

Users with the participant role (participants) gain access to a third text
channel, `#gate-reset`. Through this channel, participants can call for a reset
of the vm.

To call for a reset, a user will type `__RESET`. The gatebot will then post a
message with two reactions: a check (:heavy_check_mark:) and an x (:x:). Users
will click on these reactions to vote. 

The vote will last for a minute. If, after this minute, there are more positive
votes than negative votes, the virtual machine will be reset.

Regardless of whether the vote succeeds or fails, a five minute cooldown will be
placed on calling another vote (i.e. another reset cannot be requested for
another five minutes after the first reset vote ends).



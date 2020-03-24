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
streamer), so users can see their actions take place.

## Discord Channels

Three channels will be added to the server, each placed in a new category
labelled `THE BILLY GATE`.

- #gate-chat: For discussion about the Gate. We provide this as a space for
  people to coordinate activities if they wish. The bot will NOT read messages
  in this channel.
- #gate-control: The channel by which the users can control the VM. **EVERY
  MESSAGE SENT IN THIS CHANNEL WILL BE INTERPRETED AS A COMMAND BY THE BOT.**
  There is no prefix necessary to get the gatebot's attention.
- The Gate: The voice channel through which `The Window` will stream the virtual
  machine. Full voice chat and streaming capabilities will remain open to all
  users in the channel, but `The Window` should not be muted.

## Interaction

Users will interact with the Billy Gate through the `#gate-control` channel.
Every message sent in this channel is interpreted as a command to the gatebot.

Users are allowed five commands every thirty seconds. Each command is one of the
following:

- Pressing a single key on the vm's keyboard
- Moving the mouse to a space on the vm
- Clicking the mouse in the vm

After a successful command is sent, the gatebot will process the command and
place a thumbs-up reaction on the command message when done. If an unsuccessful
command is sent, the gatebot will place a red X reaction on the message and
respond, citing the command that was attempted, the user that requested it, and
why it failed. (Some reasons a command might fail are invalid syntax,
insufficient command allowance, invalid arguments, etc.)

### Command philosophy

Commands should be intuitive and verbose. It should be obvious, or at least
difficult to forget, how to invoke certain keys and use the mouse. Keep in mind
we are targeting an audience that may not be technically sophisticated, so we do
not rely on specific intuition that only savvy users may understand (like ^C for
ctrl shortcuts, bot prefixes, etc). Thus, commands are kept prefix-less and in
verbose English.

### Keyboard interaction

To press a key, users send a message with the name of the key. For example, to
press `s`, users simply send a message containing `s`. The following special
keys can also be pressed by sending these commands:

- `tab`
- `space`
- `left`
- `right`
- `down`
- `up`
- `windows` | `super`
- `ctrl` | `control`
- `alt`
- `shift`
- `capslock`
- `del` | `delete`
- `backspace`
- `pgup` | `pageup`
- `pgdn` | `pgdown` | `pagedown`
- `enter`
- `escape` | `esc`

To press multiple keys at the same time, include each key in a space or `+`
separated list. For example, to press ctrl+s, send `ctrl s` or `ctrl+s` (or even
`s+ctrl`).

Essentially, commands are valid if they follow this regex, where `<key>` is any
valid key:

`^\s*(<key>[ +]+)*<key>\s*$`

### Mouse interaction

Users are able to move the vm's mouse relatively and absolutely, as well as
click both its left and right buttons.

To move the mouse to an *absolute* position, send `mouse to x y`, where `x` and
`y` are the x and y coordinates in pixels of the new position. (0, 0) is defined
as the **bottom left** corner of the screen, as most people would expect.

If either x or y is out of bounds for the vm's screen, the command fails.

Users can also move the mouse relatively. To do so, send `mouse move x y`, where
x is how far (in pixels) to move the mouse right and y is how far (in pixels) to
move the mouse up. If the mouse's new position would go out of the vm's screen,
the command fails.

To left-click the vm's mouse, send `click` or `leftclick`. To right-click the
vm's mouse, send rightclick.

Scrolling the mouse is not supported. Users should use `pgup` and `pgdown`
instead.

### Command limitations

Commands are limited to five per user per thirty seconds. This is handled by a
global timer - when enough time passes on the timer, all users have their
allowance of commands reset.

If a user attempts to send a command after already exhausting their command
allowance, the gatebot will scold them and will not process their command. If a
user sends a multi-command message that exhausts their command allowance, NONE
of their commands will be processed. For instance, if a user has two commands
left and they send `ctrl+alt+del`, the gatebot will scold them and nothing will
happen.

The gatebot will only notify users of how many commands they have left when they
send an command with an insufficient allowance OR they send the special
`!commandsleft` command.

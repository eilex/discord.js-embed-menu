<div align="center">
  <p>
    <a href="https://github.com/eilex/discord.js-embed-menu"><img src="https://img.shields.io/npm/v/discord.js-embed-menu" alt="NPM version" /></a>
    <a href="https://discord.js.org"><img src="https://img.shields.io/npm/dependency-version/discord.js-embed-menu/discord.js" alt="NPM (prod) dependency version" /></a>
    <a href="https://nodei.co/npm/discord.js-embed-menu"><img src="https://img.shields.io/npm/dt/discord.js-embed-menu" alt="NPM downloads" /></a>
    <a href="https://nodei.co/npm/discord.js-embed-menu"><img src="https://img.shields.io/npm/dw/discord.js-embed-menu" alt="NPM downloads week" /></a>
    
  </p>
  <p>
    <a href="https://nodei.co/npm/discord.js-embed-menu/"><img src="https://nodei.co/npm/discord.js-embed-menu.png?downloads=true&stars=true" alt="npm installnfo" /></a>
  </p>
</div>

## Table of contents

- [About](#about)
- [Installation](#installation)
- [Example usage](#example-usage)
- [Special destinations](#special-destinations)
- [Contributing](#contributing)
- [Links](#links)

## About

discord.js-embed-menu is a [Node.js](https://nodejs.org) module based on [discord.js-menu](https://github.com/jowsey/discord.js-menu) that allows you to easily create reaction embeds menu using
[discord.js](https://discord.js.org/#/).

- Channel and direct message menu
- Remove other users reactions
- Pagination system
- Mention user
- Timeout and auto delete

## Installation

**Node.js 14.0.0 or newer is required.**  

```shell
npm i discord.js-embed-menu --save
```

## Example usage

```js
/* Import all the usual stuff. */
import { Client, MessageEmbed } from 'discord.js';
import { DiscordEmbedMenu } from 'discord.js-embed-menu';

const client = new Client();

/* Run this code every time a new message is sent. */
client.on('message', message => {
    if (message.content === '!menu') {
        /*
         * The menu class takes 3 mandatory parameters and 5 optional parameters. 
         * 1) A channel to send the menu to, it can be null so it will send DMs to the user.
         * 2) A user to give control over the navigation or send DM if channel is null.
         * 3) An array of Page objects or DiscordEmbedMenuPage, each being a unique page of the menu.
         * 4) How long, in milliseconds, you want the menu to wait for new reactions, it can be null so it will wait for ever (not recommended).
         * 5) If it shall or not delete the message on menu timeout.
         * 6) If it shall mention menu's user on discord channels.
         * 7) If it shall keep last user reaction when you call stop.
         * 8) The message to be displayed when it's loading the menu page.
         */
        let menu = new DiscordEmbedMenu(message.channel, message.author, [
            {
                /*
                 * A page object consists of three items:
                 * 1) A name. This is used as a unique destination name for reactions.
                 * 2) Some content. This is a rich embed. You can use {object: formatting} or .functionFormatting() for embeds. Whichever you prefer.
                 * 3) A set of reactions, linked to either a page destination or a function.* (See example pages)
                 * 
                 * Reactions can be emojis or custom emote IDs, and reaction destinations can be either the names
                 * of pages, () => { functions }, or special destination names. See below for a list of these.
                 */

                /* You can call pages whatever you like. The first in the array is always loaded first. */
                name: 'main',
                content: new MessageEmbed({
                    title: 'Main menu',
                    description: 'Please chose an action',
                    fields: [
                        {
                            name: "📝 Sub menu",
                            value: "Goes to another menu.",
                            inline: false
                        },
                        {
                            name: "✉️ Direct message",
                            value: "Sends a direct message.",
                            inline: false
                        },
                        {
                            name: "❌ Close",
                            value: "Close the menu.",
                            inline: false
                        }
                    ]
                }),
                reactions: {
                    '📝': 'sub-menu',
                    '✉️': async (menu) => {
                        menu.user.send(`Hello dear ${menu.user.username}.`);
                    },
                    '❌': 'delete'
                }
            },
            {
                name: 'sub-menu',
                content: new MessageEmbed({
                    title: 'Sub menu',
                    description: 'This is another page.',
                    fields: [
                        {
                            name: "⬅️ Back",
                            value: "Go backwards.",
                            inline: false
                        },
                        {
                            name: "❌ Close",
                            value: "Close the menu.",
                            inline: false
                        }
                    ]
                }),
                reactions: {
                    '⬅️': 'main',
                    '❌': 'delete'
                }
            }
        ]);

        /* Run Menu.start() when you're ready to send the menu. */
        menu.start();

        /* The menu also has two events you can use.
         * The "page-changing" event fires just before a new page is sent.
         * The "page-changed" event fires after the new page is sent.
         */
        menu.on('page-changing', (oldPageIndex, oldPage, newPageIndex, newPage) => {
            console.log(`Menu is going from "${oldPage.content.title}" (${oldPageIndex}) to "${newPage.content.title}" (${newPageIndex})`);
        });

        menu.on('page-changed', (pageIndex, page) => {
            console.log(`Menu is now on "${page.content.title}" (${pageIndex})`);
        });
    }
});

client.login("Get your bot's oauth token at https://discord.com/developers/applications");
```

## Special Destinations

Discord.js-embed-menu comes with 6 pre-defined destinations with specific uses.

| Destination 	| Function                                                      	|
|-------------	|---------------------------------------------------------------	|
| first       	| Goes to the first page in the array.                          	|
| last        	| Goes to the last page in the array.                           	|
| previous    	| Goes to the previous page in the array.                       	|
| next        	| Goes to the next page in the array.                           	|
| stop        	| Removes reactions from the embed and stops updating the menu. 	|
| delete      	| Stops the menu and deletes the message.                       	|

Calling a page one of these wouldn't work, it prioritizes special destinations.

## Contributing

Before creating an issue, please ensure that it hasn't already been reported/suggested.

## Links

- [discord.js](https://github.com/discordjs/discord.js)
- [discord.js-menu](https://github.com/jowsey/discord.js-menu)
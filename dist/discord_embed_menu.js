"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordEmbedMenu = void 0;
const events_1 = require("events");
const discord_js_1 = require("discord.js");
const discord_embed_menu_page_1 = require("./discord_embed_menu_page");
class DiscordEmbedMenu extends events_1.EventEmitter {
    constructor(channel, user, pages, timeout = 300000, deleteOnTimeout = true, mention = true, keepUserReactionOnStop = true, loadingMessage) {
        super();
        this.menu = null;
        this.reactionCollector = null;
        this.data = {};
        this.channel = channel;
        this.user = user;
        this.timeout = timeout;
        this.deleteOnTimeout = deleteOnTimeout;
        this.mention = mention;
        this.keepUserReactionOnStop = keepUserReactionOnStop;
        this.loadingMessage = loadingMessage ? loadingMessage : DiscordEmbedMenu.LOADING_MESSAGE;
        this.isDM = !this.channel || this.channel.type === 'dm';
        this.userTag = '<@' + this.user.id + '>';
        this.pages = [];
        for (let i = 0, l = pages.length; i < l; i++) {
            let page = pages[i];
            this.pages.push(page instanceof discord_embed_menu_page_1.DiscordEmbedMenuPage ? page : new discord_embed_menu_page_1.DiscordEmbedMenuPage(page.name, page.content, page.reactions, i));
        }
        this.currentPage = this.pages[0];
        this.pageIndex = 0;
        if (!this.isDM) {
            if (this.channel.client.user) {
                let missingPerms = [];
                let clientPermissions = this.channel.permissionsFor(this.channel.client.user);
                if (clientPermissions) {
                    if (!clientPermissions.has('ADMINISTRATOR')) {
                        DiscordEmbedMenu.REQUIRED_PERMS.forEach((permission) => {
                            if (!clientPermissions || clientPermissions.has(permission)) {
                                missingPerms.push(permission);
                            }
                        });
                    }
                    if (missingPerms.length > 0) {
                        console.log(`\x1B[96m[discord.js-embed-menu]\x1B[0m Looks like you're missing ${missingPerms.join(', ')} in #${this.channel.name} (${this.channel.guild.name}). This perms are needed for basic menu operation. You'll probably experience problems sending menus in this channel.`);
                    }
                }
                else {
                    console.log('\x1B[96m[discord.js-embed-menu]\x1B[0m Something went wrong while checking BOT permissions.');
                }
            }
            else {
                console.log('\x1B[96m[discord.js-embed-menu]\x1B[0m Something went wrong while checking BOT permissions.');
            }
        }
    }
    async start() {
        return this.setPage(0);
    }
    async stop() {
        this.stopReactions(false);
        if (this.menu && this.keepUserReactionOnStop) {
            this.menu.reactions.cache.array().forEach(async (reaction) => {
                if (this.menu && this.menu.client && this.menu.client.user) {
                    await reaction.users.remove(this.menu.client.user.id);
                }
            });
        }
        else if (!this.isDM) {
            return await this.clearReactions();
        }
    }
    async delete() {
        this.stopReactions(false);
        if (this.menu) {
            return await this.menu.delete();
        }
    }
    async clearReactions() {
        if (this.menu && !this.isDM) {
            return this.menu.reactions.removeAll();
        }
    }
    async setPage(page = 0) {
        if (typeof (page) === 'string') {
            let pageIndex = this.pages.findIndex(p => p.name === page);
            if (pageIndex != -1) {
                page = pageIndex;
            }
            else {
                throw new Error(`Page "${page}" not found!`);
            }
        }
        this.emit('page-changing', this.pageIndex, this.currentPage, page, this.pages[page]);
        this.pageIndex = page;
        this.currentPage = this.pages[this.pageIndex];
        let content = (!this.isDM && this.mention ? this.userTag : '');
        let loadingEmbed = new discord_js_1.MessageEmbed({
            title: this.currentPage.content.title,
            description: this.loadingMessage
        });
        if (this.isDM) {
            if (this.menu) {
                await this.menu.delete();
                this.menu = null;
            }
            if (this.channel) {
                this.menu = await this.channel.send(content, { embed: loadingEmbed });
            }
            else {
                this.menu = await this.user.send(content, { embed: loadingEmbed });
                this.channel = this.menu.channel;
            }
        }
        else {
            if (this.menu) {
                await this.menu.edit(content, { embed: loadingEmbed });
            }
            else {
                this.menu = await this.channel.send(content, { embed: loadingEmbed });
            }
        }
        this.stopReactions(true);
        await this.addReactions();
        this.awaitReactions();
        await this.menu.edit(content, { embed: this.currentPage.content });
        this.emit('page-changed', this.pageIndex, this.currentPage);
    }
    async addReactions() {
        let reactions = [];
        if (this.menu) {
            for (let reaction in this.currentPage.reactions) {
                reactions.push(await this.menu.react(reaction));
            }
        }
        return reactions;
    }
    stopReactions(triggerEnd = true) {
        if (this.reactionCollector) {
            if (!triggerEnd) {
                this.reactionCollector.removeAllListeners();
            }
            this.reactionCollector.stop();
            this.reactionCollector = null;
        }
    }
    awaitReactions() {
        if (this.menu) {
            this.reactionCollector = this.menu.createReactionCollector((_reaction, user) => {
                return this.menu != null && this.menu.client != null && this.menu.client.user != null && user.id != this.menu.client.user.id;
            }, this.timeout ? { idle: this.timeout } : undefined);
            let reactionsChanged;
            this.reactionCollector.on('end', (reactions) => {
                if (!this.isDM) {
                    if (reactions) {
                        if (reactionsChanged) {
                            return this.clearReactions();
                        }
                        else if (this.menu) {
                            reactions.array()[0].users.remove(this.menu.client.users.cache.get(this.user.id));
                        }
                    }
                    else if (this.deleteOnTimeout) {
                        return this.delete();
                    }
                    else {
                        return this.clearReactions();
                    }
                }
            });
            this.reactionCollector.on('collect', (reaction, user) => {
                const reactionName = Object.prototype.hasOwnProperty.call(this.currentPage.reactions, reaction.emoji.name)
                    ? reaction.emoji.name
                    : Object.prototype.hasOwnProperty.call(this.currentPage.reactions, reaction.emoji.id) ? reaction.emoji.id : null;
                if (user.id !== this.user.id || !Object.keys(this.currentPage.reactions).includes(reactionName)) {
                    return reaction.users.remove(user);
                }
                if (reactionName && this.menu) {
                    if (typeof this.currentPage.reactions[reactionName] === 'function') {
                        return this.currentPage.reactions[reactionName](this);
                    }
                    switch (this.currentPage.reactions[reactionName]) {
                        case 'first': {
                            reactionsChanged = JSON.stringify(this.menu.reactions.cache.keyArray()) != JSON.stringify(Object.keys(this.pages[0].reactions));
                            this.setPage(0);
                            break;
                        }
                        case 'last': {
                            reactionsChanged = JSON.stringify(this.menu.reactions.cache.keyArray()) != JSON.stringify(Object.keys(this.pages[this.pages.length - 1].reactions));
                            this.setPage(this.pages.length - 1);
                            break;
                        }
                        case 'previous': {
                            if (this.pageIndex > 0) {
                                reactionsChanged = JSON.stringify(this.menu.reactions.cache.keyArray()) != JSON.stringify(Object.keys(this.pages[this.pageIndex - 1].reactions));
                                this.setPage(this.pageIndex - 1);
                            }
                            break;
                        }
                        case 'next': {
                            if (this.pageIndex < this.pages.length - 1) {
                                reactionsChanged = JSON.stringify(this.menu.reactions.cache.keyArray()) != JSON.stringify(Object.keys(this.pages[this.pageIndex + 1].reactions));
                                this.setPage(this.pageIndex + 1);
                            }
                            break;
                        }
                        case 'stop': {
                            this.stop();
                            break;
                        }
                        case 'delete': {
                            this.delete();
                            break;
                        }
                        default: {
                            reactionsChanged = JSON.stringify(this.menu.reactions.cache.keyArray()) != JSON.stringify(Object.keys(this.pages.find(p => p.name === this.currentPage.reactions[reactionName]).reactions));
                            this.setPage(this.pages.findIndex(p => p.name === this.currentPage.reactions[reactionName]));
                            break;
                        }
                    }
                }
            });
        }
    }
}
exports.DiscordEmbedMenu = DiscordEmbedMenu;
DiscordEmbedMenu.REQUIRED_PERMS = ['SEND_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'];
DiscordEmbedMenu.LOADING_MESSAGE = 'Loading, please be patient...';

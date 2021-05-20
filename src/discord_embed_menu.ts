import { EventEmitter } from 'events';
import { TextChannel, User, Message, MessageEmbed, PermissionString, MessageReaction, ReactionCollector, Collection } from 'discord.js';

import { DiscordEmbedMenuPage } from './discord_embed_menu_page';

export class DiscordEmbedMenu extends EventEmitter {

    private static readonly REQUIRED_PERMS: PermissionString[] = ['SEND_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'];
    private static LOADING_MESSAGE: string = 'Loading, please be patient...';

    public channel: TextChannel;
    public user: User;
    public pages: any[];
    public timeout: number;
    public deleteOnTimeout: boolean;
    public mention: boolean;
    public keepUserReactionOnStop: boolean;
    public loadingMessage: string;

    private isDM: boolean;
    private userTag: string;

    public currentPage: DiscordEmbedMenuPage;
    public pageIndex: number;

    public menu: Message | null = null;
    public reactionCollector: ReactionCollector | null = null;

    public data: any = {};

    public constructor(channel: TextChannel, user: User, pages: (any | DiscordEmbedMenuPage)[], timeout: number = 300000, deleteOnTimeout: boolean = true, mention: boolean = true, keepUserReactionOnStop: boolean = true, loadingMessage?: string) {
        super();
        this.channel = channel;
        this.user = user;
        this.timeout = timeout;
        this.deleteOnTimeout = deleteOnTimeout;
        this.mention = mention;
        this.keepUserReactionOnStop = keepUserReactionOnStop;
        this.loadingMessage = loadingMessage ? loadingMessage : DiscordEmbedMenu.LOADING_MESSAGE;

        this.isDM = !this.channel || this.channel.type === ('dm' as 'text');
        this.userTag = '<@' + this.user.id + '>';

        this.pages = [];
        for (let i = 0, l = pages.length; i < l; i++) {
            let page = pages[i];
            this.pages.push(page instanceof DiscordEmbedMenuPage ? page : new DiscordEmbedMenuPage(page.name, page.content, page.reactions, i));
        }
        this.currentPage = this.pages[0];
        this.pageIndex = 0;

        if (!this.isDM) {
            if (this.channel.client.user) {
                let missingPerms: PermissionString[] = [];
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
                } else {
                    console.log('\x1B[96m[discord.js-embed-menu]\x1B[0m Something went wrong while checking BOT permissions.');
                }
            } else {
                console.log('\x1B[96m[discord.js-embed-menu]\x1B[0m Something went wrong while checking BOT permissions.');
            }
        }
    }

    public async start(): Promise<void> {
        return this.setPage(0);
    }

    public async stop(): Promise<void | Message> {
        this.stopReactions(false);
        if (this.menu && this.keepUserReactionOnStop) {
            this.menu.reactions.cache.array().forEach(async (reaction: MessageReaction) => {
                if (this.menu && this.menu.client && this.menu.client.user) {
                    await reaction.users.remove(this.menu.client.user.id);
                }
            });
        } else if (!this.isDM) {
            return await this.clearReactions();
        }
    }

    public async delete(): Promise<void | Message> {
        this.stopReactions(false);
        if (this.menu) {
            return await this.menu.delete();
        }
    }

    private async clearReactions(): Promise<void | Message> {
        if (this.menu && !this.isDM) {
            return this.menu.reactions.removeAll();
        }
    }

    public async setPage(page: number = 0): Promise<void> {
        this.emit('page-changing', this.pageIndex, this.currentPage, page, this.pages[page]);

        this.pageIndex = page;
        this.currentPage = this.pages[this.pageIndex];

        let content = (!this.isDM && this.mention ? this.userTag : '');
        let loadingEmbed = new MessageEmbed({
            title: this.currentPage.content.title as string,
            description: this.loadingMessage
        });

        if (this.isDM) {
            if (this.menu) {
                await this.menu.delete();
                this.menu = null;
            }
            if (this.channel) {
                this.menu = await this.channel.send(content, { embed: loadingEmbed });
            } else {
                this.menu = await this.user.send(content, { embed: loadingEmbed });
                this.channel = this.menu.channel as TextChannel;
            }
        } else {
            if (this.menu) {
                await this.menu.edit(content, { embed: loadingEmbed });
            } else {
                this.menu = await this.channel.send(content, { embed: loadingEmbed });
            }
        }

        this.stopReactions(true);
        await this.addReactions();
        this.awaitReactions();

        await this.menu.edit(content, { embed: this.currentPage.content });

        this.emit('page-changed', this.pageIndex, this.currentPage);
    }

    private async addReactions(): Promise<MessageReaction[]> {
        let reactions: MessageReaction[] = [];
        if (this.menu) {
            for (let reaction in this.currentPage.reactions) {
                reactions.push(await this.menu.react(reaction));
            }
        }
        return reactions;
    }

    private stopReactions(triggerEnd: boolean = true) {
        if (this.reactionCollector) {
            if (!triggerEnd) {
                this.reactionCollector.removeAllListeners();
            }
            this.reactionCollector.stop();
            this.reactionCollector = null;
        }
    }

    private awaitReactions() {
        if (this.menu) {
            this.reactionCollector = this.menu.createReactionCollector((_reaction: MessageReaction, user: User): boolean => {
                return this.menu != null && this.menu.client != null && this.menu.client.user != null && user.id != this.menu.client.user.id;
            }, this.timeout ? { idle: this.timeout } : undefined);
    
            let reactionsChanged: boolean;
            this.reactionCollector.on('end', (reactions: Collection<string, MessageReaction>) => {
                if (!this.isDM) {
                    if (reactions) {
                        if (reactionsChanged) {
                            return this.clearReactions();
                        } else if (this.menu) {
                            reactions.array()[0].users.remove(this.menu.client.users.cache.get(this.user.id));
                        }
                    } else if (this.deleteOnTimeout) {
                        return this.delete();
                    } else {
                        return this.clearReactions();
                    }
                }
            })
    
            this.reactionCollector.on('collect', (reaction: MessageReaction, user: User) => {
                const reactionName = Object.prototype.hasOwnProperty.call(this.currentPage.reactions, reaction.emoji.name)
                    ? reaction.emoji.name
                    : Object.prototype.hasOwnProperty.call(this.currentPage.reactions, reaction.emoji.id as string) ? reaction.emoji.id : null;
    
                if (user.id !== this.user.id || !Object.keys(this.currentPage.reactions).includes(reactionName as string)) {
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
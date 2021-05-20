/// <reference types="node" />
import { EventEmitter } from 'events';
import { TextChannel, User, Message, ReactionCollector } from 'discord.js';
import { DiscordEmbedMenuPage } from './discord_embed_menu_page';
export declare class DiscordEmbedMenu extends EventEmitter {
    private static readonly REQUIRED_PERMS;
    private static LOADING_MESSAGE;
    channel: TextChannel;
    user: User;
    pages: any[];
    timeout: number;
    deleteOnTimeout: boolean;
    mention: boolean;
    keepUserReactionOnStop: boolean;
    loadingMessage: string;
    private isDM;
    private userTag;
    currentPage: DiscordEmbedMenuPage;
    pageIndex: number;
    menu: Message | null;
    reactionCollector: ReactionCollector | null;
    data: any;
    constructor(channel: TextChannel, user: User, pages: (any | DiscordEmbedMenuPage)[], timeout?: number, deleteOnTimeout?: boolean, mention?: boolean, keepUserReactionOnStop?: boolean, loadingMessage?: string);
    start(): Promise<void>;
    stop(): Promise<void | Message>;
    delete(): Promise<void | Message>;
    private clearReactions;
    setPage(page?: number): Promise<void>;
    private addReactions;
    private stopReactions;
    private awaitReactions;
}

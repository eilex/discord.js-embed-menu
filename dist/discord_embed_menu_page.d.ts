import { MessageEmbed } from 'discord.js';
export declare class DiscordEmbedMenuPage {
    name: string;
    content: MessageEmbed;
    reactions: any;
    index: number;
    constructor(name: string, content: MessageEmbed, reactions: any, index: number);
}

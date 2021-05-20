import { MessageEmbed } from 'discord.js';

export class DiscordEmbedMenuPage {

    public name: string;
    public content: MessageEmbed;
    public reactions: any;
    public index: number;

    public constructor(name: string, content: MessageEmbed, reactions: any, index: number) {
        this.name = name;
        this.content = content;
        this.reactions = reactions;
        this.index = index;
    }

}

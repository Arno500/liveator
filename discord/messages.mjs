const { MessageEmbed } = require('discord.js');
const { default: client } = require('./index.mjs');

export const streamStartEmbed = (streamInfo) => {
    const streamStartMessage = new MessageEmbed(streamName)
        .setColor(Math.round(Math.random()) === 0 ? '#AC9FFF' : '#FFB4C2')
        .setTitle(streamInfo.title)
        .setURL(process.env.TWITCH_URL)
        .setAuthor({ name: streamInfo.username, iconURL: client.user.avatarURL, url: process.env.TWITCH_URL })
        .setDescription(`**BendoooTV stream just started, we're playing ${streamInfo.game}! Come and join us here:**\n${process.env.TWITCH_URL}`)
        .setImage(streamInfo.thumbnail)
        .setTimestamp(streamInfo.startedAt)
        .setFooter({text: `${streamInfo.viewers} viewers`, iconURL: client.user.avatarURL})

    streamInfo.tags.forEach(tag => {
        streamStartMessage.addField(tag.name, tag.description)
    })
    const channel = client.channels.cache.get(process.env.DISCORD_TEXT_CHANNEL)
    channel.send(streamStartMessage)
}

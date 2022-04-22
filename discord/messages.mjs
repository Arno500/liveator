const { MessageEmbed } = require('discord.js');
const { client } = require('./index.mjs');

export const streamStartEmbed = async (streamInfo) => {
    const url = `https://twitch.tv/${streamInfo.username}`;
    const streamStartMessage = new MessageEmbed(streamName)
        .setColor(Math.round(Math.random()) === 0 ? '#AC9FFF' : '#FFB4C2')
        .setTitle(streamInfo.title)
        .setURL(url)
        .setAuthor({ name: streamInfo.username, iconURL: client.user.avatarURL, url })
        .setDescription(`**BendoooTV stream just started, we're playing ${streamInfo.game}! Come and join us here:**\n${url}`)
        .addField('Tags', '• ' + streamInfo.tags.join('\n• '))
        .setImage(streamInfo.thumbnail.replace('${width}', '500').replace('${height}', '500'))
        .setTimestamp(streamInfo.startedAt)
        .setFooter({text: `👁️ ${streamInfo.viewers} viewers`, iconURL: client.user.avatarURL})

    const channel = await client.channels.fetch(process.env.DISCORD_TEXT_CHANNEL)
    channel.send(streamStartMessage)
}

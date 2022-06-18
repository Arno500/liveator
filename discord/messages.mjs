import { MessageEmbed } from 'discord.js'
import client from "./index.mjs"

export const streamStartEmbed = async (streamInfo = { title: "Fake stream", username: "BendoooTV", game: "Dry-mode stream notification", tags: ["Test 1", "Test 2"], thumbnail: "https://dummyimage.com/{width}x{height}/000/fff&text=Miniature+de+stream", startedAt: new Date().getTime(), viewers: 999 }) => {
    const url = `https://twitch.tv/${streamInfo.username}`

    const streamStartMessage = new MessageEmbed()
        .setColor(Math.round(Math.random()) === 0 ? '#AC9FFF' : '#FFB4C2')
        .setTitle(streamInfo.title)
        .setURL(url)
        .setAuthor({ name: streamInfo.username, iconURL: client.user?.avatarURL, url })
        .setDescription(`**BendoooTV stream just started, we're playing ${streamInfo.game}! Come and join us here:**\n${url}`)
        .addField('Tags', '• ' + streamInfo.tags.join('\n• '))
        .setImage(streamInfo.thumbnail.replace('${width}', '500').replace('${height}', '500'))
        .setTimestamp(streamInfo.startedAt)
        .setFooter({ text: `👁️ ${streamInfo.viewers} viewers`, iconURL: client.user?.avatarURL })

    if (!(process.env.DISCORD_DISABLE === "true")) {
        const channel = await client.channels.fetch(process.env.DISCORD_TEXT_CHANNEL)
        channel.send({ embeds: [streamStartMessage] })
    }
}

export const streamStartStatus = () => {
    client.user.setActivity('🔴 Streaming', { type: 'STREAMING', url: 'https://twitch.tv/bendoootv' })
}

export const streamStopStatus = () => {
    client.user.setPresence({ activity: null })
}

export const streamStartStatus = () => {
    client.user.setActivity('🔴 Streaming', { type: 'STREAMING', url: 'https://twitch.tv/bendoootv' })
}

export const streamStopStatus = () => {
    client.user.setPresence({ activity: null })
}

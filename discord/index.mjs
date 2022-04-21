import { Client, Intents } from 'discord.js'
import { startAudioCapture } from './audio.mjs'

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS] })

client.once("ready", () => {
    console.log("Connected to Discord")
    startAudioCapture()
})

client.on("error", (error) => {
    console.error("Discord error: ", error)
    setTimeout(() => client.login(token), 1000)
})

export function initializeDiscord() {
    client.login(process.env.DISCORD_TOKEN)
}

export default client
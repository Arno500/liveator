import { Client, Intents } from 'discord.js'
import { startAudioCapture } from './audio.mjs'

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS] })


export async function initializeDiscord() {
    await client.login(process.env.DISCORD_TOKEN)
    await new Promise((resolve, reject) => {
        client.once("ready", () => {
            console.log("Connected to Discord")
            resolve()
            startAudioCapture()
        })
        client.on("error", (error) => {
            console.error("Discord error: ", error)
            reject(error)
            // setTimeout(() => client.login(token), 1000)
        })
    })
}

export default client
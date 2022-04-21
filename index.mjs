import { config as dotEnvSetup } from "dotenv"
import { setupCatchExit } from "catch-exit"
import { initializeDiscord } from "./discord/index.mjs"

import { initOBSRemote } from "./obs/index.mjs"
import { initTwitch } from "./twitch/index.mjs"

dotEnvSetup()
setupCatchExit()

async function startOBS() {
    try {
        await initOBSRemote()
    } catch (err) {
        console.error("Couldn't connect to OBS", err)
        setTimeout(startOBS, 1000)
    }
}

await Promise.all([await startOBS(), !process.env.DISCORD_DISABLE && await initializeDiscord()])
initTwitch()
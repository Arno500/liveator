import { config as dotEnvSetup } from "dotenv"
import { setupCatchExit } from "catch-exit"
import { initializeDiscord } from "./discord/index.mjs"

import { initOBSRemote } from "./obs/index.mjs"
import { initTwitch } from "./twitch/index.mjs"
import { initWS } from "./server/index.mjs"
import { startDNScheck } from "./dns/index.mjs"

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

async function startDiscord() {
    try {
        await initializeDiscord()
    } catch (err) {
        console.error("Couldn't connect to Discord", err)
        setTimeout(startDiscord, 1000)
    }
}

await initWS()
startDNScheck();
await Promise.all([await startOBS(), !(process.env.DISCORD_DISABLE === "true") && await startDiscord()])
if (process.env.TWITCH_CLIENT) {
    initTwitch()
}
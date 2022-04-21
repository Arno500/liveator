import { spawn } from 'child_process'
import ffbinaries from 'ffbinaries'

import { resolve } from "node:path"

async function getFFPlayPath() {
    let binaries = ffbinaries.locateBinariesSync(['ffplay'], { paths: [".", "../"], ensureExecutable: true })
    if (!binaries.ffplay.found) {
        await new Promise(resolve => ffbinaries.downloadBinaries("ffplay", {}, () => resolve()))
        binaries = ffbinaries.locateBinariesSync(['ffplay'], { paths: [".", "../"], ensureExecutable: true })
    }
    return binaries.ffplay.path
}

export async function startFFPlay() {
    const ffplay = spawn(resolve(await getFFPlayPath()), ["-infbuf", "-nodisp", "-v", "warning", "-"], {
        windowsHide: true,
        cwd: process.cwd(),
    })
    if (process.env.DEBUG) {
        ffplay.stdout.on('data', (data) => console.debug("[FFPLAY] " + data.toString()))
        ffplay.stderr.on('data', (data) => console.debug("[FFPLAY] " + data.toString()))
    }
    ffplay.on("exit", (code) => code > 1 && console.warn(`FFPLAY exited with code ${code}`))
    ffplay.on("error", (err) => console.error(`FFPLAY error`, err))
    ffplay.on("disconnect", () => console.error(`FFPLAY disconnected`))
    return ffplay
}

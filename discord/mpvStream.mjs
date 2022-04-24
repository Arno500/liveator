import { spawn } from 'child_process'

export async function startMPV() {
    const mpv = spawn("mpv", ["--no-cache", "--profile=low-latency", "--stream-buffer-size=8K", "--no-video", "--really-quiet", "-"], {
        windowsHide: true,
        cwd: process.cwd(),
    })
    if (process.env.DEBUG) {
        mpv.stdout.on('data', (data) => console.debug("[MPV] " + data.toString()))
        mpv.stderr.on('data', (data) => console.debug("[MPV] " + data.toString()))
    }
    mpv.on("exit", (code) => code > 1 && console.warn(`MPV exited with code ${code}`))
    mpv.on("error", (err) => console.error(`MPV error`, err))
    mpv.on("disconnect", () => console.error(`MPV disconnected`))
    return mpv
}

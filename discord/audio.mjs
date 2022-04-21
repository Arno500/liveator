import { pipeline } from 'stream'

import treeKill from "tree-kill"
import prism from '@arno500/prism-media'
import { joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus, entersState } from "@discordjs/voice"
import { addExitCallback } from "catch-exit"

import client from "./index.mjs"
import { startFFPlay } from "./ffmpegStream.mjs"


let channel

const audioStreams = new Map()

let refreshInterval = null

const setupBot = async (connection, initialVoiceChannel) => {
    let voiceChannel = initialVoiceChannel
    if (refreshInterval) clearInterval(refreshInterval)
    audioStreams.forEach(audioStream => treeKill(audioStream.ffplay.pid))
    const receiver = connection.receiver
    const stopUserFFplay = async userId => {
        if (!voiceChannel.members.has(userId)) {
            console.log(`${(await voiceChannel.guild.members.fetch(userId)).nickname} (${userId}) is not in the vocal anymore, killing the associated instance`)
            const audioStream = audioStreams.get(userId)
            try {
                treeKill(audioStream.ffplay.pid)
            } catch { }
            audioStreams.delete(userId)
        }
    }
    receiver.speaking.on("end", stopUserFFplay)
    refreshInterval = setInterval(() => audioStreams.forEach(async (audioStream, uid) => {
        stopUserFFplay(uid)
    }), 1000)
    receiver.speaking.on('start', async (userId) => {
        audioStreams.forEach(async (audioStream, uid) => {
            stopUserFFplay(uid)
        })
        if (audioStreams.has(userId)) {
            return
        }
        const opusStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.Manual,
            }
        })
        audioStreams.set(userId, opusStream)
        const bitstream = new prism.opus.OggLogicalBitstream({
            opusHead: new prism.opus.OpusHead({
                channelCount: 2,
                sampleRate: 48000,
                // preskip: 0,
            }),
            pageSizeControl: {
                maxSegments: 1,
            },
            crc: true
        })
        const ffplayInstance = await startFFPlay()
        pipeline(opusStream, bitstream, ffplayInstance.stdin, (err) => {
            if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
                console.error("Pipeline error: ", err.message)
            }
        })
        audioStreams.set(userId, {
            ffplay: ffplayInstance
        })
    })
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ])
            console.log("Bot has been moved to another channel, resetting listeners")
            voiceChannel = await client.channels.fetch(connection.joinConfig.channelId)
            audioStreams.forEach((audioStream, key) => {
                audioStreams.delete(key)
                treeKill(audioStream.ffplay.pid)
            })
            // Seems to be reconnecting to a new channel - ignore disconnect
        } catch (error) {
            console.warn("Bot has been disconnected... Reconnecting!")
            // Seems to be a real disconnect which SHOULDN'T be recovered from
            connection.destroy()
            const newConnection = joinVoiceChannel({
                channelId: initialVoiceChannel.id,
                guildId: initialVoiceChannel.guild.id,
                adapterCreator: initialVoiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: true
            })
            audioStreams.forEach((audioStream, key) => {
                audioStreams.delete(key)
                treeKill(audioStream.ffplay.pid)
            })
            setupBot(newConnection, initialVoiceChannel)
        }
    })
}

export async function startAudioCapture() {
    channel = process.env.DISCORD_CHANNEL
    const voiceChannel = await client.channels.fetch(channel)
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    })
    setupBot(connection, voiceChannel)
}

addExitCallback(() => {
    audioStreams.forEach(audioStream => treeKill(audioStream.ffplay.pid))
})

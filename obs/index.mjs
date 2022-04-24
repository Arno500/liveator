import { EventEmitter } from "events"

import { config as dotEnvSetup } from "dotenv"
import OBSWebSocket from 'obs-websocket-js'

import TWEEN from "@tweenjs/tween.js"
import { randomFromWeights } from "./utils.mjs"

dotEnvSetup()

const obs = new OBSWebSocket()

const streamersNames = process.env.STREAMERS.split(",")
const streamers = []
const templates = []

const sceneRegex = /(?<capacity>\d+)-(?<probability>\d+)-(?<name>.*)/
const placeholderRegex = /(?<index>\d+)-(?<volume>\d+(.\d+)?)-(?<name>.*)/
const textRegex = /(?<index>\d+)-(?<name>.*)/

setInterval(TWEEN.update, 1000 / 30)

class StreamManager extends EventEmitter {
    constructor() {
        super()
        this.up = false
        this.stopping = false
        this._stoppingTimeout = null
        this._sceneTimer = null
        this._transitionTimer = null
    }

    async feedState() {
        this.up = await (await obs.call("GetStreamStatus")).outputActive
    }

    async startStream() {
        if (this.stopping) {
            clearTimeout(this._stoppingTimeout)
            this._stoppingTimeout = null
            this.stopping = false
        } else if (this.up) return
        else {
            console.log("Starting stream")
            if (process.env.DRY === "false" || process.env.DRY === false)
                await obs.call("StartStream")
            this.up = true
            this.emit(StreamEvents.StreamStart)
        }
    }

    async stopStream() {
        console.log("Stopping stream")
        if (process.env.DRY === "false" || process.env.DRY === false)
            await obs.call("StopStream")
        this.stopping = false
        this.up = false
        this._stoppingTimeout = null
        this.emit(StreamEvents.StreamStop)
    }

    async debuteStopStream() {
        if (this.stopping) return
        this.stopping = true
        await obs.call("SetCurrentProgramScene", { sceneName: process.env.OBS_ENDING_SCENE })
        this._stoppingTimeout = setTimeout(this.stopStream.bind(this), process.env.OBS_ENDING_SCENE_TIME * 1000)
    }

    async _setTransitionForNewStreamer() {
        if (this._transitionTimer) {
            clearTimeout(this._transitionTimer)
            this._transitionTimer = null
        } else await obs.call("SetCurrentSceneTransition", { transitionName: process.env.OBS_STREAMER_TRANSITION_NAME })
        this._transitionTimer = setTimeout(() => {
            this._transitionTimer = setInterval(async () => {
                if ((await obs.call("GetCurrentSceneTransition")).transitionConfigurable) {
                    clearInterval(this._transitionTimer)
                    this._transitionTimer = setTimeout(async () => {
                        await obs.call("SetCurrentSceneTransition", { transitionName: process.env.OBS_STANDARD_TRANSITION_NAME })
                        clearTimeout(this._transitionTimer)
                        this._transitionTimer = null
                    }, 600)
                }
            }, 100)
        }, Number(process.env.OBS_STREAMER_TRANSITION_DURATION))
    }

    /**
     * This function is used to set the text of a template
     * @param {*} key The name of the templated text (after the "template-" prefix)
     * @param {*} value The text to insert
     * @returns {Promise}
     */
    async setText(key, value) {
        try {
            await obs.call("SetInputSettings", { inputSettings: { text: String(value) }, inputName: "templated-" + key })
        } catch (err) {
            console.error("An error occured while setting the text of the text template. Does the template exist?\n", err)
        }
    }
}

class Streamer extends EventEmitter {
    constructor(streamerName, inputName) {
        super()
        this.streamerName = streamerName
        this.inputName = inputName
        this.up = false
    }
}

class Template {
    constructor(sceneName, placeholders) {
        const { capacity, probability, name } = sceneName.match(sceneRegex).groups
        this.sceneName = sceneName
        this.name = name
        this.capacity = Number(capacity)
        this.probability = Number(probability)
        this.placeholders = placeholders
    }
}

class Placeholder {
    constructor(itemName, item) {
        this.item = item
        const { index, volume, name } = itemName.match(placeholderRegex).groups
        this.index = Number(index)
        this.volume = Number(volume)
        this.name = name
        this.text = new Text
        this.streamer = null
    }
}

class Text {
    constructor(item) {
        if (!item) return
        this.item = item
        const { index, name } = item.sourceName.match(textRegex).groups
        this.index = Number(index)
        this.name = name
        this.value = ""
    }

    set value(value) {
        obs.call("SetInputSettings", { inputSettings: { text: value }, inputName: this.item.sourceName })
        return value
    }
}

async function getScenesWithItems() {
    const obsScenes = await obs.call("GetSceneList")
    obsScenes.scenes = await Promise.all(obsScenes.scenes.map(async scene => ({
        ...scene,
        items: await obs.call("GetSceneItemList", { sceneName: scene.sceneName })
    })))
    return obsScenes
}

async function cleanInputs() {
    const obsScenes = await getScenesWithItems()
    const parkingSceneIndex = obsScenes.scenes.findIndex(scene => scene.sceneName.toLowerCase() === "parking")
    obsScenes.scenes.splice(parkingSceneIndex, 1)
    for (const scene of obsScenes.scenes) {
        for (const item of scene.items.sceneItems) {
            if (item.inputKind === "ffmpeg_source" && item.sourceName.startsWith("SRT")) {
                await obs.call("RemoveSceneItem", { sceneName: scene.sceneName, sceneItemId: item.sceneItemId })
            }
        }
    }
}

async function extractSRTInputs() {
    let inputs = new Set()
    const obsInputs = await getScenesWithItems()
    const parkingSceneIndex = obsInputs.scenes.findIndex(scene => scene.sceneName.toLowerCase() === "parking")
    const parkingScene = obsInputs.scenes[parkingSceneIndex]
    parkingScene.items.sceneItems.forEach(item => {
        if (item.inputKind === "ffmpeg_source" && item.sourceName.startsWith("SRT")) {
            inputs.add(item.sourceName)
        }
    })
    obsInputs.scenes.splice(parkingSceneIndex, 1)
    for (const scene of obsInputs.scenes) {
        for (const item of scene.items.sceneItems) {
            if (item.inputKind === "ffmpeg_source" && item.sourceName.startsWith("SRT")) {
                await obs.call("RemoveSceneItem", { sceneName: scene.sceneName, sceneItemId: item.sceneItemId })
            }
        }
    }
    inputs = [...inputs].sort((a, b) => a.localeCompare(b))
    streamers.push(...inputs.map((input, index) => new Streamer(streamersNames[index], input)))
}

async function fixStreamerState(streamer) {
    const status = await obs.call("GetMediaInputStatus", { inputName: streamer.inputName })
    const nextStatus = status.mediaState === "OBS_MEDIA_STATE_PLAYING" && status.mediaCursor > 0
    const changed = nextStatus !== streamer.up
    nextStatus ? streamer.up = true : streamer.up = false
    if (changed) {
        console.log(`Streamer state changed for ${streamer.streamerName}: ${nextStatus}`)
        streamer.emit(StreamerEvents.StreamerConnection, nextStatus)
    }
}

async function setupStreamerStateWatching() {
    streamers.forEach(async (streamer) => {
        await fixStreamerState(streamer)
        setInterval(async () => fixStreamerState(streamer), 250)
    })
}

async function setupTemplates() {
    const obsScenes = await getScenesWithItems()
    obsScenes.scenes.filter(scene => sceneRegex.test(scene.sceneName)).forEach(async scene => {
        const textPlaceholders = Object.fromEntries(scene.items.sceneItems
            .filter(item => item.inputKind === "text_gdiplus_v2" && textRegex.test(item.sourceName))
            .map(item => {
                const text = new Text(item)
                return [text.index, new Text(item)]
            }))
        templates.push(new Template(
            scene.sceneName,
            scene.items.sceneItems
                .filter(item => item.inputKind === "color_source_v3" && placeholderRegex.test(item.sourceName))
                .map(item => {
                    const placeholder = new Placeholder(item.sourceName, { ...item })
                    placeholder.text = textPlaceholders[placeholder.index]
                    return placeholder
                })
        ))
    })
    await setupStreamersInsideTemplates()
}

function findOnlineStreamers() {
    return streamers.filter(streamer => streamer.up)
}

function findAvailableScenes() {
    const activeStreamers = findOnlineStreamers()
    return templates.filter(template => template.capacity === activeStreamers.length)
}

function getPlaceholdersWithStreamers(placeholders, streamers) {
    const sortedPlaceholdersByPosition = [...placeholders].sort((a, b) => a.item.sceneItemIndex - b.item.sceneItemIndex)
    const sortedPlaceholdersByIndex = [...placeholders].sort((a, b) => a.index - b.index)
    return sortedPlaceholdersByPosition.map(placeholder => ({
        placeholder,
        streamer: streamers[sortedPlaceholdersByIndex.indexOf(placeholder)]
    }))
}

async function setupStreamersInsideTemplates() {
    const activeStreamers = findOnlineStreamers()
    const activeTemplates = findAvailableScenes()
    await Promise.all(activeTemplates.map(template => Promise.all(getPlaceholdersWithStreamers(template.placeholders, activeStreamers).map(async ({ placeholder, streamer }) => {
        const posData = await obs.call("GetSceneItemTransform", { sceneItemId: placeholder.item.sceneItemId, sceneName: template.sceneName })
        await obs.call("SetSceneItemEnabled", { sceneName: template.sceneName, sceneItemId: placeholder.item.sceneItemId, sceneItemEnabled: false })
        const { sceneItemId } = await obs.call("CreateSceneItem", { sceneName: template.sceneName, sourceName: streamer.inputName })
        await obs.call("SetSceneItemTransform", {
            sceneItemId, sceneName: template.sceneName, sceneItemTransform: {
                ...posData.sceneItemTransform,
                boundsWidth: posData.sceneItemTransform.boundsWidth < 1 ? 1 : posData.sceneItemTransform.boundsWidth,
                boundsHeight: posData.sceneItemTransform.boundsHeight < 1 ? 1 : posData.sceneItemTransform.boundsHeight
            }
        })
        if (placeholder.text) placeholder.text.value = streamer.streamerName
        placeholder.streamer = streamer
    }))))
}

async function switchToNewScene() {
    const scenes = findAvailableScenes()
    if (scenes.length === 0) {
        console.warn("No available scene")
        return
    }
    const randomScene = randomFromWeights(scenes)
    console.log("Changing scene to " + randomScene.sceneName)
    await obs.call("SetCurrentProgramScene", { sceneName: randomScene.sceneName })
    const onlineStreamers = findOnlineStreamers()
    const sortedScenes = getPlaceholdersWithStreamers(randomScene.placeholders, onlineStreamers)
    sortedScenes.forEach(async ({ streamer, placeholder }) => {
        const inputVolume = await obs.call("GetInputVolume", { inputName: streamer.inputName })
        if (placeholder.volume !== Math.round(inputVolume.inputVolumeMul * 100) / 100)
            setTimeout(() => new TWEEN.Tween(inputVolume).to({ inputVolumeMul: placeholder.volume }, Number(process.env.OBS_STREAMER_TRANSITION_DURATION) / 4).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(() => {
                obs.call("SetInputVolume", { inputName: streamer.inputName, inputVolumeMul: inputVolume.inputVolumeMul })
            }).start(), Number(process.env.OBS_STREAMER_TRANSITION_DURATION) / 2)
    })
    if (streamManager._sceneTimer) clearTimeout(streamManager._sceneTimer)
    streamManager._sceneTimer = setTimeout(switchToNewScene, (Math.random() * Number(process.env.OBS_SCENE_SWITCH_RANDOM) + Number(process.env.OBS_SCENE_SWITCH_MIN)) * 1000)
}

async function setStreamStatus() {
    const onlineStreamers = findOnlineStreamers()
    if (onlineStreamers.length >= 1) {
        await streamManager.startStream()
    } else if (onlineStreamers.length === 0) {
        await streamManager.debuteStopStream()
    }
}

function setupStreamerEvents() {
    streamers.forEach(streamer => {
        streamer.on(StreamerEvents.StreamerConnection, async nextState => {
            clearTimeout(streamManager._sceneTimer)
            await streamManager._setTransitionForNewStreamer()
            if (findOnlineStreamers().length >= 1) {
                await cleanInputs()
                await setupStreamersInsideTemplates()
                await switchToNewScene()
            }
            await setStreamStatus()
        })
    })
}


export async function initOBSRemote() {
    await obs.connect(process.env.OBS_HOST, process.env.OBS_SECRET)
    await streamManager.feedState()
    await extractSRTInputs()
    await cleanInputs()
    await setupStreamerStateWatching()
    await setupTemplates()
    setupStreamerEvents()
    await streamManager._setTransitionForNewStreamer()
    switchToNewScene()
}
export const StreamerEvents = {
    StreamerConnection: 'StreamerConnection'
}
export const StreamEvents = {
    StreamStart: 'StreamStart',
    StreamStop: 'StreamStop'
}

export const streamManager = new StreamManager()

export default streamManager
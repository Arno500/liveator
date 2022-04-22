import got from 'got'
import { streamStartEmbed } from '../discord/messages.mjs'
import streamManager from '../obs/index.mjs'

let accessToken
let latestFollower

const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": process.env.TWITCH_CLIENT
}

const refreshToken = async () => {
    const res = await got.post('https://id.twitch.tv/oauth2/token', {
        form: {
            client_id: process.env.TWITCH_CLIENT,
            client_secret: process.env.TWITCH_SECRET,
            grant_type: 'client_credentials'
        }
    }).json()
    accessToken = res.access_token
}

const checkTokenValidity = async () => {
    const res = await got.get('https://id.twitch.tv/oauth2/validate', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    }).json()
    return res.status === 200
}

const getFollowersInfo = async () => {
    const res = await got.get(`https://api.twitch.tv/helix/users/follows`, {
        headers,
        searchParams: {
            to_id: process.env.TWITCH_ID
        }
    }).json()
    return { latestFollower: res.data[0].from_name, totalFollowers: res.total }
}

const getStreamInfo = async () => {
    const res = await got.get('https://api.twitch.tv/helix/streams', {
        headers,
        searchParams: {
            user_id: process.env.TWITCH_ID
        }
    }).json()
    return { title: res.data[0].title, username: res.data[0].user_name, game: res.data[0].game_name, viewers: res.data[0].viewer_count, thumbnail: res.data[0].thumbnail_url, startedAt: res.data[0].started_at, tags: res.data[0].tag_ids }
}

const getTagsInfo = async (tags) => {
    const tag_id = tags.map(tag => `tag_id=${tag}`).join('&')
    const res = await got.get('https://api.twitch.tv/helix/tags/streams', {
        headers,
        searchParams: {
            tag_id
        }
    }).json()
    /**TODO: change to map*/
    const tagsArray = []
    res.data.forEach(tag => {
        tagsArray.push({ name: tag.localization_names['en-us'], description: tag.localization_descriptions['en-us'] })
    })
    return tagsArray
}

export const initTwitch = async () => {
    try {
        await refreshToken()
    } catch (err) {
        console.error('Error occured during access token initialization', err)
    }
    setInterval(async () => {
        try {
            if (!(await checkTokenValidity())) {
                refreshToken()
            }
        } catch (err) {
            console.error('Error occured during access token validation or refresh', err)
        }
    }, 3600 * 24 * 1000)
    setInterval(async () => {
        if (process.env.DRY || streamManager.up) {
            try {
                const { totalFollowers, latestFollower: lastFollowerFetched } = await getFollowersInfo()
                if (lastFollowerFetched !== latestFollower) {
                    streamManager.setText('latestFollower', lastFollowerFetched)
                    streamManager.setText('totalFollowers', totalFollowers)
                }
            }
            catch (err) {
                console.error('Error occured during followers\' information fetching', err)
            }
        }
    }, 1000)
    streamManager.on('start', async () => {
        let streamInfo
        try {
            streamInfo = await getStreamInfo()
        } catch (err) {
            console.error('Error occured during stream information fetching', err)
        }
        try {
            streamInfo.tags = await getTagsInfo(streamInfo.tags)
        } catch (err) {
            console.error('Error occured during tags information fetching', err)
        }
        streamStartEmbed(streamInfo)
    })
}
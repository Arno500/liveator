import got from 'got'
import streamManager from '../obs/index.mjs'

let accessToken
let latestFollower

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
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Client-Id": process.env.TWITCH_CLIENT
        },
        searchParams: {
            to_id: process.env.TWITCH_ID
        }
    }).json()
    return { latestFollower: res.data[0].from_name, totalFollowers: res.total }
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
}
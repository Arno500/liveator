import prism from '@arno500/prism-media'

import { startFFPlay } from './ffmpegStream.mjs'

import { pipeline } from 'stream'
import treeKill from 'tree-kill'
import { parentPort } from 'worker_threads'

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
parentPort.on("message", (value) => {
    // worker threads do not have multiple listeners available for passing different event,
    // therefore add one onMessage listener, and pass an object with commands/data from main thread
    if (value === "exit") {
        treeKill(ffplayInstance.pid)
        process.exit(0);
    }
})
pipeline(process.stdin, bitstream, ffplayInstance.stdin, () => {
    treeKill(ffplayInstance.pid)
    process.exit(0);
})


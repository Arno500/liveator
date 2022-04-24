class PromiseQueue {
    constructor() {
        this.queue = []
        this.promise = null
    }

    add(promise) {
        this.queue.push(promise)
        if (this.promise === null) {
            this.run()
        }
    }

    run() {
        this.promise = this.queue.shift()
        this.promise().then(() => {
            this.promise = null
            if (this.queue.length > 0) {
                this.run()
            }
        })
    }

    clear() {
        this.queue = []
        this.promise = null
    }
}

const queue = new PromiseQueue()
let ws

const restartSocket = () => setTimeout(() => setupWS(), 1000)

function setupWS() {
    if (ws) {
        ws.removeEventListener("close", restartSocket)
    }
    ws = new WebSocket('ws://localhost:42069')
    ws.addEventListener("close", restartSocket, 1000)
}
setupWS()

const user = document.querySelector('.user')
const action = document.querySelector('.action')
const wrapper = document.querySelector('.wrapper')
const userText = document.querySelectorAll('.userText > *')

function triggerAnimation(type, user) {
    return new Promise(resolve => {
        wrapper.classList.add('visible')
        userText.forEach(text => {
            text.textContent = user
            setTimeout(() => {
                text.classList.add('triggered')
            }, 2000)
        })
        switch (type) {
            case 'follow':
                document.documentElement.style.setProperty('--text-color', '#AC9FFF');
                action.textContent = 'just followed the channel! 💖'
                break;
            case 'subscribe':
                document.documentElement.style.setProperty('--text-color', '#FFB4C2');
                action.textContent = 'just subscribed to the channel! 💖'
                break;
            default:
                console.error('Unknown message type', type)
                break;
        }
        setTimeout(() => {
            userText.forEach(text => text.classList.remove('triggered'))
        }, 4000)
        setTimeout(() => {
            wrapper.classList.remove('visible')
            setTimeout(() => resolve(), 500)
        }, 6000)
    })
}

ws.addEventListener('message', (event) => {
    console.log('Received message from server')
    const message = JSON.parse(event.data)
    queue.add(() => triggerAnimation(message.type, message.user))
})

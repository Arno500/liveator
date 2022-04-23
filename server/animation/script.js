const ws = new WebSocket('ws://localhost:42069')

const user = document.querySelector('.user')
const action = document.querySelector('.action')
const wrapper = document.querySelector('.wrapper')
const userText = document.querySelectorAll('.userText > *')

ws.addEventListener('message', (data) => {
    console.log('Received message from server')
    const message = JSON.parse(data)
    wrapper.classList.add('visible')
    userText.forEach(text => {
        text.textContent = message.user
        setTimeout(() => {
            text.classList.add('triggered')
        }, 2000)
    })
    switch (message.type) {
        case 'follow':
            document.documentElement.style.setProperty('--text-color', '#AC9FFF');
            action.textContent = 'just followed the channel! 💖'
            break;
        case 'subscribe':
            document.documentElement.style.setProperty('--text-color', '#FFB4C2');
            action.textContent = 'just subscribed to the channel! 💖'
            break;
        default:
            console.error('Unknown message type', message)
            break;
    }
    setTimeout(() => {
        userText.forEach(text => text.classList.remove('triggered'))
    }, 4000)
    setTimeout(() => {
        wrapper.classList.remove('visible')
    }, 6000)
})

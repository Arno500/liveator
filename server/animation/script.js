const ws = new WebSocket('ws://localhost:42069')

const content = document.querySelector('.content')

ws.addEventListener('message', (data) => {
    console.log('Received message from server ')
    const message = JSON.parse(data)
    switch (message.type) {
        case 'follow':
            content.textContent = `${message.user} just followed the channel! 💖`
            break;
        case 'subscribe':
            content.textContent = `${message.user} just subscribed to the channel! 💖`
            break;
        case 'bits':
            content.textContent = `${message.user} just donated ??? bits! 💖`
            break;
        default:
            console.error('Unknown message type', message)
            break;
    }
    content.classList.remove('hidden')
})

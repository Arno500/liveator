import { WebSocket, WebSocketServer } from 'ws'

/**
 * @type {WebSocket.WebSocketServer}
 */
let wss

export const initWS = async () => {
  wss = new WebSocketServer({ port: 42069 })
  wss.on("connection", (ws) => {
    console.log("A WebSocket client has been connected")
  })
  wss.on("close", () => console.warn("The WebSocket client previously connected has been disconnected"))
  await new Promise((resolve, reject) => {
    wss.once('listening', () => resolve())
    wss.once('error', (error) => reject(error))
  })
}

export const sendEvent = (type, user) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, user }));
    }
  })
}

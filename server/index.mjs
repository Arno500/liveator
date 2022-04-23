import { WebSocketServer } from 'ws'

let wss
/**
 * @type {WebSocket.Websocket}
 */
let lastConnection

export const initWS = async () => {
  wss = new WebSocketServer({ port: 42069 })
  wss.on("connection", (ws) => {
    console.log("A WebSocket client has been connected")
    lastConnection.close(1, "Only one connection is allowed")
    lastConnection = ws
  })
  wss.on("close", () => console.warn("The WebSocket client previously connected has been disconnected"))
  await new Promise((resolve, reject) => {
    wss.once('listening', () => resolve())
    wss.once('error', (error) => reject(error))
  })
}

export const sendEvent = (type, user) => {
  lastConnection.send(JSON.stringify({ type, user }))
}

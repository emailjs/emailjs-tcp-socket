import TCPSocket from '../../'

const a2s = arr => String.fromCharCode.apply(null, new Uint8Array(arr))
const s2a = str => new Uint8Array(str.split('').map(char => char.charCodeAt(0))).buffer

window.onload = () => {
  console.log(TCPSocket)
  console.log(TCPSocket.open)
  const socket = TCPSocket.open('localhost', 8888)
  socket.onopen = () => {
    socket.send(s2a('payload'))
  }
  socket.ondata = ({ data }) => {
    const incomingData = a2s(data)
    const elem = document.createElement('textarea')
    elem.innerText = incomingData
    elem.id = 'result'
    document.body.appendChild(elem)
  }
}

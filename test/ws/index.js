import TCPSocket from '../../'
import { PORT_NET, PORT_TLS } from '../constants'

const a2s = arr => String.fromCharCode.apply(null, new Uint8Array(arr))
const s2a = str => new Uint8Array(str.split('').map(char => char.charCodeAt(0))).buffer
const ca = '-----BEGIN CERTIFICATE-----\r\n' +
  'MIID8DCCAtigAwIBAgIJALnqbvYxoZYrMA0GCSqGSIb3DQEBCwUAMFkxCzAJBgNV\r\n' +
  'BAYTAkFVMRMwEQYDVQQIEwpTb21lLVN0YXRlMSEwHwYDVQQKExhJbnRlcm5ldCBX\r\n' +
  'aWRnaXRzIFB0eSBMdGQxEjAQBgNVBAMTCWxvY2FsaG9zdDAeFw0xNzEyMTIxMTE1\r\n' +
  'MDJaFw0xOTA0MjYxMTE1MDJaMIHCMQswCQYDVQQGEwJVUzERMA8GA1UECAwITmV3\r\n' +
  'IFlvcmsxEjAQBgNVBAcMCVJvY2hlc3RlcjESMBAGA1UECgwJRW5kIFBvaW50MRcw\r\n' +
  'FQYDVQQLDA5UZXN0aW5nIERvbWFpbjFLMEkGCSqGSIb3DQEJARY8eW91ci1hZG1p\r\n' +
  'bmlzdHJhdGl2ZS1hZGRyZXNzQHlvdXItYXdlc29tZS1leGlzdGluZy1kb21haW4u\r\n' +
  'Y29tMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw\r\n' +
  'ggEKAoIBAQDoKjPR9RpvrI2F4xcrpGyvCOQOJuyV3WyXU1BpeoqszESVWqlckyE6\r\n' +
  '6Xr5igA5pk8brMGkXS6v/utdgyGc81cbdoPUP99GK+/d6igwJg08po8JuAS7+0Wd\r\n' +
  'Lepp3TLa13e2In7mVQ1lBQ5+lsLn/N505lsaJG0ADvExM4qJvOHq+2w3BS4Ko32M\r\n' +
  'KyjF2zyaeVOSNudVJsA2ooYecQ2Sj2TZjoXd1YPDyS0JWV1VOSvLa2KTbUCjy8PB\r\n' +
  'zIax2YgeilIz/Bu2QAC1Z3Cm0ZzBA+7IP626rv1FfRlY5WvBmuikySFrZt8iQkRN\r\n' +
  '/hWDPR425SX+qTjs3nBTqp9sBPhyqLl9AgMBAAGjUTBPMB8GA1UdIwQYMBaAFPap\r\n' +
  '6Ia1Joc2U+KZ1vCYfZ0jeibaMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgTwMBQGA1Ud\r\n' +
  'EQQNMAuCCWxvY2FsaG9zdDANBgkqhkiG9w0BAQsFAAOCAQEABX00ZO3SouwkDoxQ\r\n' +
  'Ox/vUTqNcbLD7qNvt8vXUXTp6pviV/ZSHrFLEBEwAdlYw02uANorXb86bHE31VJ3\r\n' +
  'ORZl6aoSm00OatuF7xDi0fD4x0PCYCgExlQF54ttJi+dqYRP/QyShZrDUJ2l5CbS\r\n' +
  '5DdK9DCrpTrXNGmSc5pWIo/bosDaDiB/sgTRu8/WzyNzsIPkwAEVWy05Wk6rcdwV\r\n' +
  'uQGuMGuYPG+3oZyVHYKKHMPF42PGw/Vs6O4h8I1Q2QsfNmm2GzqQVwW26LNsKsti\r\n' +
  'BdEBYoOldyx+Ul+607hCnDD4qVjuJcbRc5r9Q2w25SNDTXpPtAERkq1Q3M2GT/Of\r\n' +
  'ERiojg==\r\n' +
  '-----END CERTIFICATE-----'

window.onload = () => {
  const net = TCPSocket.open('localhost', PORT_NET)
  net.onopen = () => {
    net.send(s2a('payload'))
  }
  net.ondata = ({ data }) => {
    const incomingData = a2s(data)
    const elem = document.createElement('textarea')
    elem.innerText = incomingData
    elem.id = 'plaintext'
    document.body.appendChild(elem)
  }

  const useSecureTransport = true
  const tls = TCPSocket.open('localhost', PORT_TLS, { useSecureTransport, ca })
  tls.onopen = () => {
    tls.send(s2a('payload'))
  }
  tls.ondata = ({ data }) => {
    const incomingData = a2s(data)
    const elem = document.createElement('textarea')
    elem.innerText = incomingData
    elem.id = 'tls'
    document.body.appendChild(elem)
  }
}

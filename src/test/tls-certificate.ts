import { generateKeyPairSync, randomBytes, sign } from 'node:crypto'

const der = (tag: number, ...parts: Buffer[]): Buffer => {
  const content = Buffer.concat(parts)
  const lengthBytes: number[] = []
  for (let length = content.length; length > 0; length >>>= 8) {
    lengthBytes.unshift(length & 0xff)
  }
  const length =
    content.length < 128
      ? [content.length]
      : [0x80 | lengthBytes.length, ...lengthBytes]
  return Buffer.concat([Buffer.from([tag, ...length]), content])
}

const sequence = (...parts: Buffer[]) => der(0x30, ...parts)
const oid = (hex: string) => der(0x06, Buffer.from(hex, 'hex'))
const time = (date: Date) =>
  der(
    0x18,
    Buffer.from(
      date
        .toISOString()
        .replace(/[-:T]/g, '')
        .replace(/\.\d+Z$/, 'Z')
    )
  )

/** Create a self-signed localhost certificate with an ephemeral in-memory key. */
export const createTlsCertificate = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })
  const serial = randomBytes(16)
  serial[0] = (serial[0] & 0x7f) | 1

  // Node signs certificates but has no X.509 issuance API. This minimal DER
  // structure is only for local TLS tests, not a general certificate issuer.
  const algorithm = sequence(oid('2a8648ce3d040302')) // ECDSA with SHA-256
  const name = sequence(
    der(0x31, sequence(oid('550403'), der(0x0c, Buffer.from('localhost'))))
  )
  const now = Date.now()
  const extensions = sequence(
    sequence(
      oid('551d13'), // Basic constraints: this self-signed cert is a trust anchor.
      der(0x01, Buffer.from([0xff])),
      der(0x04, sequence(der(0x01, Buffer.from([0xff]))))
    ),
    sequence(
      oid('551d0f'), // Key usage: digital signature and certificate signing.
      der(0x01, Buffer.from([0xff])),
      der(0x04, der(0x03, Buffer.from([2, 0x84])))
    ),
    sequence(
      oid('551d25'), // Extended key usage: TLS server authentication.
      der(0x04, sequence(oid('2b06010505070301')))
    ),
    sequence(
      oid('551d11'), // Subject alternative names: localhost and 127.0.0.1.
      der(
        0x04,
        sequence(
          der(0x82, Buffer.from('localhost')),
          der(0x87, Buffer.from([127, 0, 0, 1]))
        )
      )
    )
  )
  const certificate = sequence(
    der(0xa0, der(0x02, Buffer.from([2]))), // X.509 version 3
    der(0x02, serial),
    algorithm,
    name,
    sequence(time(new Date(now - 60_000)), time(new Date(now + 3_600_000))),
    name,
    publicKey.export({ type: 'spki', format: 'der' }),
    der(0xa3, extensions)
  )
  const signature = sign('sha256', certificate, privateKey)
  const encoded = sequence(
    certificate,
    algorithm,
    der(0x03, Buffer.from([0]), signature)
  ).toString('base64')
  const cert = `-----BEGIN CERTIFICATE-----\n${encoded.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`

  return { key: privateKey.export({ type: 'pkcs8', format: 'pem' }), cert }
}

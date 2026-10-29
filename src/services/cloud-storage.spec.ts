import nock from 'nock'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { mockLogger } from '../test/logger.js'
import { makeS3Store } from './s3-store/service.js'
import { makeGsStore } from './gs-store/service.js'

const S3_ENDPOINT = 'http://127.0.0.1:46991'
const GCS_ENDPOINT = 'http://127.0.0.1:46992'
const BUCKET = 'ejector-sdk-fixture'
const GCS_OBJECTS = `/storage/v1/b/${BUCKET}/o`

const s3List = (keys: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>${BUCKET}</Name><IsTruncated>false</IsTruncated>
  ${keys.map((key) => `<Contents><Key>${key}</Key></Contents>`).join('')}
</ListBucketResult>`

describe('Cloud storage SDK HTTP compatibility', () => {
  let credentialsDirectory: string | undefined

  beforeEach(async () => {
    credentialsDirectory = await mkdtemp(join(tmpdir(), 'ejector-sdk-'))
    const configFile = join(credentialsDirectory, 'config')
    const credentialsFile = join(credentialsDirectory, 'credentials')
    await Promise.all([
      writeFile(configFile, ''),
      writeFile(credentialsFile, ''),
    ])
    // AWS_PROFILE takes precedence over environment credentials in the SDK.
    // Empty shared files also prevent local profiles or credential_process use.
    for (const name of [
      'AWS_PROFILE',
      'AWS_DEFAULT_PROFILE',
      'AWS_WEB_IDENTITY_TOKEN_FILE',
      'AWS_ROLE_ARN',
      'AWS_ROLE_SESSION_NAME',
      'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
      'AWS_CONTAINER_CREDENTIALS_FULL_URI',
      'AWS_CONTAINER_AUTHORIZATION_TOKEN',
      'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE',
    ]) {
      vi.stubEnv(name, undefined)
    }
    vi.stubEnv('AWS_CONFIG_FILE', configFile)
    vi.stubEnv('AWS_SHARED_CREDENTIALS_FILE', credentialsFile)
    // The real SDK serializers run, but every network request must match Nock.
    nock.disableNetConnect()
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'fixture-access-key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'fixture-secret-key')
    vi.stubEnv('AWS_SESSION_TOKEN', '')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    vi.stubEnv('AWS_EC2_METADATA_DISABLED', 'true')
    vi.stubEnv('AWS_MAX_ATTEMPTS', '1')
    vi.stubEnv('AWS_ENDPOINT_URL_S3', S3_ENDPOINT)
    vi.stubEnv('AWS_IGNORE_CONFIGURED_ENDPOINT_URLS', 'false')
    vi.stubEnv('STORAGE_EMULATOR_HOST', `${GCS_ENDPOINT}/storage/v1`)
  })

  afterEach(async () => {
    const pending = nock.pendingMocks()
    nock.cleanAll()
    nock.enableNetConnect()
    vi.unstubAllEnvs()
    if (credentialsDirectory) {
      await rm(credentialsDirectory, { recursive: true, force: true })
      credentialsDirectory = undefined
    }
    expect(pending).toEqual([])
  })

  const s3 = () =>
    nock(S3_ENDPOINT).matchHeader(
      'authorization',
      /^AWS4-HMAC-SHA256 Credential=fixture-access-key\//
    )

  const listS3 = (keys: string[]) =>
    s3()
      .get(`/${BUCKET}/`)
      .query({ 'list-type': '2' })
      .reply(200, s3List(keys), { 'Content-Type': 'application/xml' })

  it('reads one S3 page and downloads each object exactly once as UTF-8', async () => {
    const files = [
      { filename: 'first.json', content: '{"message":"exit"}' },
      { filename: 'folder/second.json', content: '{"message":"выход"}' },
    ]
    const list = listS3(files.map(({ filename }) => filename))
    let listRequests = 0
    list.on('request', () => listRequests++)
    let downloads = 0
    const objects = files.map(({ filename, content }) => {
      const scope = s3()
        .get(`/${BUCKET}/${filename}`)
        .query({ 'x-id': 'GetObject' })
        .reply(200, content, { 'Content-Type': 'application/json' })
      scope.on('request', () => downloads++)
      return scope
    })

    const store = makeS3Store({ logger: mockLogger() })
    await expect(store.read(`s3://${BUCKET}`)).resolves.toEqual(files)
    expect(listRequests).toBe(1)
    expect(downloads).toBe(files.length)
    expect(objects.every((scope) => scope.isDone())).toBe(true)
  })

  it('propagates an S3 listing error with the SDK cause', async () => {
    s3()
      .get(`/${BUCKET}/`)
      .query({ 'list-type': '2' })
      .reply(
        403,
        '<Error><Code>AccessDenied</Code><Message>fixture denied</Message></Error>',
        { 'Content-Type': 'application/xml' }
      )

    await expect(
      makeS3Store({ logger: mockLogger() }).read(`s3://${BUCKET}`)
    ).rejects.toMatchObject({
      message: 'Unable to list bucket files from AWS S3.',
      cause: { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } },
    })
  })

  it('propagates an S3 download error with the SDK cause', async () => {
    listS3(['missing.json'])
    s3()
      .get(`/${BUCKET}/missing.json`)
      .query({ 'x-id': 'GetObject' })
      .reply(
        404,
        '<Error><Code>NoSuchKey</Code><Message>fixture missing</Message></Error>',
        { 'Content-Type': 'application/xml' }
      )

    await expect(
      makeS3Store({ logger: mockLogger() }).read(`s3://${BUCKET}`)
    ).rejects.toMatchObject({
      message: 'Unable to read file from AWS S3.',
      cause: { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } },
    })
  })

  const gcs = () =>
    nock(GCS_ENDPOINT).matchHeader('authorization', (value) => !value)

  it('reads GCS pages and validates downloaded bytes with CRC32C headers', async () => {
    gcs()
      .get(GCS_OBJECTS)
      .reply(200, {
        items: [{ name: 'first.json', bucket: BUCKET }],
        nextPageToken: 'second-page',
      })
      .get(GCS_OBJECTS)
      .query({ pageToken: 'second-page' })
      .reply(200, { items: [{ name: 'empty.json', bucket: BUCKET }] })
    // CRC32C("123456789") = 0xe3069283; the empty payload has CRC32C 0.
    gcs()
      .get(`${GCS_OBJECTS}/first.json`)
      .query({ alt: 'media' })
      .reply(200, '123456789', {
        'x-goog-hash': 'crc32c=4waSgw==',
        'x-goog-stored-content-encoding': 'identity',
      })
      .get(`${GCS_OBJECTS}/empty.json`)
      .query({ alt: 'media' })
      .reply(200, '', {
        'x-goog-hash': 'crc32c=AAAAAA==',
        'x-goog-stored-content-encoding': 'identity',
      })

    await expect(
      makeGsStore({ logger: mockLogger() }).read(`gs://${BUCKET}`)
    ).resolves.toEqual([
      { filename: 'first.json', content: '123456789' },
      { filename: 'empty.json', content: '' },
    ])
  })

  it('propagates a GCS listing error', async () => {
    gcs()
      .get(GCS_OBJECTS)
      .reply(403, { error: { code: 403, message: 'fixture denied' } })

    await expect(
      makeGsStore({ logger: mockLogger() }).read(`gs://${BUCKET}`)
    ).rejects.toMatchObject({
      message: 'Unable to list bucket files from Google Storage.',
      cause: { code: 403 },
    })
  })

  it('propagates a GCS download error', async () => {
    gcs()
      .get(GCS_OBJECTS)
      .reply(200, { items: [{ name: 'missing.json', bucket: BUCKET }] })
      .get(`${GCS_OBJECTS}/missing.json`)
      .query({ alt: 'media' })
      .reply(404, { error: { code: 404, message: 'fixture missing' } })

    await expect(
      makeGsStore({ logger: mockLogger() }).read(`gs://${BUCKET}`)
    ).rejects.toMatchObject({
      message: 'Unable to read file from Google Storage.',
      cause: { code: 404 },
    })
  })

  it('rejects GCS bytes that do not match the CRC32C response header', async () => {
    gcs()
      .get(GCS_OBJECTS)
      .reply(200, { items: [{ name: 'corrupted.json', bucket: BUCKET }] })
      .get(`${GCS_OBJECTS}/corrupted.json`)
      .query({ alt: 'media' })
      .reply(200, '123456789', {
        'x-goog-hash': 'crc32c=AAAAAA==',
        'x-goog-stored-content-encoding': 'identity',
      })

    await expect(
      makeGsStore({ logger: mockLogger() }).read(`gs://${BUCKET}`)
    ).rejects.toMatchObject({
      message: 'Unable to read file from Google Storage.',
      cause: { code: 'CONTENT_DOWNLOAD_MISMATCH' },
    })
  })
})

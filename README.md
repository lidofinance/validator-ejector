<img src="https://user-images.githubusercontent.com/4752441/209329469-aee5d699-af5e-467b-9213-4d09b1a22012.png" width="50%" height="50%">

# Lido Validator Ejector

Daemon service which loads LidoOracle events for validator exits and sends out exit messages when necessary.

On start, it will load events from a configurable amount of blocks behind and then poll for new events.

## Requirements

- Folder of pre-signed exit messages as individual JSON files in either [spec format](https://github.com/lidofinance/validator-ejector/blob/d2e4db190935239e019618b948a1bd1cea20f88f/src/services/messages-processor/service.ts#L19-L25) (generic) or [ethdo output format](https://github.com/wealdtech/ethdo/blob/master/docs/usage.md#exit)
- Execution node
- Consensus node

This service has to be run in a single instance as it expects to fulfil every request to exit. Each unfulfilled request (no exit message being present for required validator) will log an error.

## Configuration

### Operation Modes

For both modes, Ejector will monitor exit request events, but react to them differently.

#### Messages Mode

In this mode, Ejector will load pre-signed exit messages from .json files on start, validate them, and submit them to a CL node when necessary.

Mode is activated by setting the MESSAGES_LOCATION variable.

#### Webhook Mode

In this mode, Ejector will make a request to a specified endpoint when an exit needs to be made instead of submitting a pre-signed exit message to a CL node.

Mode is activated by setting the VALIDATOR_EXIT_WEBHOOK variable.

This allows NOs to implement JIT approach by offloading exiting logic to an external service and using the Ejector as a secure exit events reader.

On the endpoint, JSON will be POSTed with the following structure:

```json
{
  "validatorIndex": "123",
  "validatorPubkey": "0x123"
}
```

200 response from the endpoint will be counted as a successful exit, non-200 as a fail.

### Environment Variables

Options are configured via environment variables.

| Variable                                      | Required | Default/Example       | Description                                                                                                                                                                                                                                                                     |
|-----------------------------------------------|----------|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| EXECUTION_NODE                                | Yes      | http://1.2.3.4:8545   | Ethereum Execution Node endpoint                                                                                                                                                                                                                                                |
| CONSENSUS_NODE                                | Yes      | http://1.2.3.4:5051   | Ethereum Consensus Node endpoint                                                                                                                                                                                                                                                |
| JWT_SECRET_PATH                               | No       | /data/neth/jwt.hex    | Path to JWT secret hex file for Nethermind RPC authentication. If provided, will generate a new JWT token for each execution node request                                                                                                                                       |
| LOCATOR_ADDRESS                               | Yes      | 0x123                 | Address of the Locator contract [Hoodi](https://docs.lido.fi/deployed-contracts/hoodi/) / [Mainnet](https://docs.lido.fi/deployed-contracts/)                                                                                                                                   |
| STAKING_MODULE_ID                             | Yes      | 123                   | Staking Module ID for which operator ID is set, currently only one exists - ([NodeOperatorsRegistry](https://github.com/lidofinance/lido-dao#contracts)) with id `1`                                                                                                            |
| OPERATOR_ID                                   | Yes      | 123                   | Operator ID in the Node Operators registry, easiest to get from Operators UI: [Hoodi](https://operators-hoodi.testnet.fi/)/[Mainnet](https://operators.lido.fi)                                                                                                                 |
| OPERATOR_IDENTIFIERS                          | No       | [0,1,2]               | Alternative to OPERATOR_ID. Array of Operator IDs to handle exits for multiple operators simultaneously                                                                                                                                                                         |
| MESSAGES_LOCATION                             | No       | messages              | Local folder or external storage bucket url to load json exit message files from. Required if you are using exit messages mode                                                                                                                                                  |
| VALIDATOR_EXIT_WEBHOOK                        | No       | http://webhook        | POST validator info to an endpoint instead of sending out an exit message in order to initiate an exit. Required if you are using webhook mode                                                                                                                                  |
| ORACLE_ADDRESSES_ALLOWLIST                    | Yes      | ["0x123"]             | Allowed Oracle addresses to accept transactions. List can be obtained from HashConsensus contract on [Hoodi](https://hoodi.etherscan.io/address/0x32EC59a78abaca3f91527aeB2008925D5AaC1eFC)/[Mainnet](https://etherscan.io/address/0xD624B08C83bAECF0807Dd2c6880C3154a5F0B288)  |
| EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST | Yes      | ["0x123"]             | Allowed wallet addresses to create Easy track motion to withdrawal validator without lido oracle participation                                                                                                                                                                  |
| SUBMIT_TX_HASH_ALLOWLIST                      | No       | ["0x123"]             | Allowed transactions to withdrawal validator via voting (For example, to verify Aragon voting withdrawal), without lido oracle participation                                                                                                                                    | 
| EASY_TRACK_ADDRESS                            | No       | 0x123                 | Easy track contract address. Needed only if you want accept withdrawal requests via easy track.                                                                                                                                                                                 |
| MESSAGES_PASSWORD                             | No       | password              | Password to decrypt encrypted exit messages with. Needed only if you encrypt your exit messages                                                                                                                                                                                 |
| MESSAGES_PASSWORD_FILE                        | No       | password_inside.txt   | Path to a file with password inside to decrypt exit messages with. Needed only if you have encrypted exit messages. If used, MESSAGES_PASSWORD (not MESSAGES_PASSWORD_FILE) needs to be added to LOGGER_SECRETS in order to be sanitized                                        |
| BLOCKS_PRELOAD                                | No       | 50000                 | Amount of blocks to load events from on start. Increase if daemon was not running for some time. Defaults to a week of blocks                                                                                                                                                   |
| JOB_INTERVAL                                  | No       | 384000                | Time interval in milliseconds to run checks. Defaults to time of 1 epoch                                                                                                                                                                                                        |
| HTTP_PORT                                     | No       | 8989                  | Port to serve metrics and health check on                                                                                                                                                                                                                                       |
| RUN_METRICS                                   | No       | false                 | Enable metrics endpoint                                                                                                                                                                                                                                                         |
| RUN_HEALTH_CHECK                              | No       | true                  | Enable health check endpoint                                                                                                                                                                                                                                                    |
| LOGGER_LEVEL                                  | No       | info                  | Severity level from which to start showing errors eg info will hide debug messages                                                                                                                                                                                              |
| LOGGER_FORMAT                                 | No       | simple                | Simple or JSON log output: simple/json                                                                                                                                                                                                                                          |
| LOGGER_SECRETS                                | No       | ["MESSAGES_PASSWORD"] | JSON string array of either env var keys to sanitize in logs or exact values                                                                                                                                                                                                    |
| DRY_RUN                                       | No       | false                 | Run the service without actually sending out exit messages                                                                                                                                                                                                                      |
| TRUST_MODE                                    | No       | false                 | Skip security checks for exit requests. Please, use it only if you running your own RPC nodes.                                                                                                                                                                                  |
| DISABLE_SECURITY_DONT_USE_IN_PRODUCTION       | No       | false                 | Deprecated: Use TRUST_MODE instead. Skip security checks for exit requests                                                                                                                                                                                                      |
| FORCE_DENCUN_FORK_MODE                        | No       | false                 | Start the service in Dencun fork mode                                                                                                                                                                                                                                           |
| WEBHOOK_ABORT_TIMEOUT_MS                      | No       | 10_000                | Timeout for webhook response                                                                                                                                                                                                                                                    |
| WEBHOOK_MAX_RETRIES                           | No       | 0                     | Maximum retries for webhook                                                                                                                                                                                                                                                     |
| CAPELLA_FORK_VERSION                          | No       | 0x03000000            | Optional parameter to specify Capella fork version                                                                                                                                                                                                                              |

Messages can also be loaded from remote storages: AWS S3 and Google Cloud Storage.

Simply set a url with an appropriate protocol in `MESSAGES_LOCATION`:

- `s3://` for S3
- `gs://` for GCS

Authentication setup: [GCS](https://cloud.google.com/docs/authentication/application-default-credentials#attached-sa), [S3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

## Preparing Exit Messages

Once you generate and sign exit messages, you can encrypt them for storage safety.

Exit messages are encrypted and decrypted following the [EIP-2335](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2335.md) spec.

You can check a simple example in JS in `encryptor` folder:

Simply copy JSON exit message files to `encryptor/input`, set encryption password as `MESSAGES_PASSWORD` in `.env` and run:

```bash
yarn encrypt
```

Done, your encrypted files will be in `encryptor/output`.

## Running

Either:

- Use a Docker image from [Docker Hub](https://hub.docker.com/r/lidofinance/validator-ejector)
- Clone repo, install dependencies, build and start the service:

```bash
git clone https://github.com/lidofinance/validator-ejector.git
cd validator-ejector
yarn
yarn build
yarn start
```

Don't forget env variables in the last command.

## Metrics

Enable metrics endpoint by setting `HTTP_PORT=1234` and `RUN_METRICS=true` environment variables.

Metrics will be available on `$HOST:$HTTP_PORT/metrics`.

Available metrics:

- exit_messages: ['valid'] - Exit messages and their validity: JSON parseability, structure and signature
- exit_actions: ['result'] - Statuses of initiated validator exits
- event_security_verification: ['result'] - Statuses of exit event security verifications
- polling_last_blocks_duration_seconds: ['eventsNumber'] - Duration of polling last blocks in microseconds
- execution_request_duration_seconds: ['result', 'status', 'domain'] - Execution node request duration in microseconds
- consensus_request_duration_seconds: ['result', 'status', 'domain'] - Consensus node request duration in microseconds
- job_duration_seconds: ['name', 'interval', 'result'] - Duration of Ejector cycle cron job
- job_message_reloader_duration_seconds: ['name', 'interval', 'result'] - Duration of Pre-signed message reloader cron job
- exit_messages_left_number - Number of exit messages left
- exit_messages_left_percent - Percentage of exit messages left

## Safety Features

- Encrypted messages allow for secure file storage
- Invalid files in messages folder are noticed
- Exit JSON structure is checked
- Exit signature is fully validated
- Exit event pubkeys are checked to exist in transaction data
- Exit event report data hashes are checked to match hashes in original submitReport() Oracle transactions
- Exit events original consensus transactions are checked to be signed by allowlisted Oracles
- Node requests are repeated on error or timeouts
- Amount of messages left to send out can be checked using metrics
- Dry run mode to test setup

## Troubleshooting

### Installation Issues

#### Node.js Version Compatibility

The project requires Node.js v18. If you encounter build errors with @chainsafe/blst or other native modules:

```bash
# Check your Node.js version
node --version

# If using Node.js v24 or higher, switch to v18
nvm install 18
nvm use 18

# Clear caches and reinstall
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

#### macOS Setup

When you try to use Lido Validator Ejector on ARM Mac, you may encounter problems with @chainsafe/blst dependencies.

**Python Command Not Found:**
```bash
# Create python symlink (required for node-gyp)
sudo ln -s /opt/homebrew/bin/python3 /usr/local/bin/python
# Or alternatively:
sudo ln -s $(which python3) /usr/local/bin/python
```

**Build Dependencies:**
```bash
# Install Xcode command line tools
xcode-select --install

# Install Python development headers (if using pyenv)
env PYTHON_CONFIGURE_OPTS="--enable-framework" pyenv install 3.x.x
```

#### Linux Setup

**Ubuntu/Debian:**
```bash
# Install build dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-dev make g++ gcc build-essential

# Create python symlink
sudo ln -sf /usr/bin/python3 /usr/bin/python
```

**CentOS/RHEL:**
```bash
# Install build dependencies  
sudo yum install -y python3 python3-devel make gcc gcc-c++

# Create python symlink
sudo ln -sf /usr/bin/python3 /usr/bin/python
```

### Docker Issues

#### Platform Architecture Mismatch

If you see "exec format error" on Linux servers:

```bash
# Build for correct platform
docker build --platform linux/amd64 -t validator-ejector .

```

#### Network Connection Issues

If the container cannot connect to `127.0.0.1:8545`:

1. **Use host networking** (recommended for localhost services):
   ```yaml
   # In docker-compose.yml
   services:
     app:
       network_mode: host
   ```

2. **Use server IP instead** of localhost:
   ```bash
   # In .env file
   EXECUTION_NODE=http://YOUR_SERVER_IP:8545
   CONSENSUS_NODE=http://YOUR_SERVER_IP:5052
   ```

More info: https://github.com/ChainSafe/lodestar/issues/4767#issuecomment-1640631566

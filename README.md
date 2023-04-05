<img src="https://user-images.githubusercontent.com/4752441/209329469-aee5d699-af5e-467b-9213-4d09b1a22012.png" width="50%" height="50%">

# Lido Validator Ejector

Daemon service which loads LidoOracle events for validator exits and sends out exit messages when necessary.

On start, it will load events from a configurable amount of blocks behind and then poll for new events.

## Requirements

- Folder of pre-signed exit messages as individual JSON files in either spec format or [ethdo output format](https://github.com/wealdtech/ethdo/blob/master/docs/usage.md#exit)
- Execution node
- Consensus node

This service has to be run in a single instance as it expects to fulfil every request to exit. Each unfulfilled request (no exit message being present for required validator) will log an error.

## Configuration

Options are configured via environment variables.

| Variable                   | Required | Default/Example       | Description                                                                                                                  |
| -------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EXECUTION_NODE             | Yes      | http://1.2.3.4:8545   | Ethereum Execution Node endpoint                                                                                             |
| CONSENSUS_NODE             | Yes      | http://1.2.3.4:5051   | Ethereum Consensus Node endpoint                                                                                             |
| LOCATOR_ADDRESS            | Yes      | 0x123                 | Address of the Locator contract, can be found in the [lido-dao repo](https://github.com/lidofinance/lido-dao)                |
| STAKING_MODULE_ID          | Yes      | 123                   | Staking Module ID for which operator ID is set                                                                               |
| OPERATOR_ID                | Yes      | 123                   | Operator ID in the Node Operators registry, easiest to get from [Operators UI](https://operators.lido.fi)                    |
| MESSAGES_LOCATION          | Yes      | messages              | Folder to load json exit message files from                                                                                  
| REMOTE_MESSAGES_LOCATIONS         | Yes      | []                    | Array with links to json exit message files from s3 or google cloud storage                                                                                 |
| VALIDATOR_EXIT_WEBHOOK     | No       | http://webhook      | POST validator info to an endpoint instead of sending out an exit message in order to initiate an exit. Required if you are using webhook mode                                                                                                          |
| ORACLE_ADDRESSES_ALLOWLIST | Yes      | ["0x123"]             | Allowed Oracle addresses to accept transactions from                                                                         |
| MESSAGES_PASSWORD          | No       | password              | Password to decrypt encrypted exit messages with. Needed only if you have encrypted files in messages directory              |
| MESSAGES_PASSWORD_FILE     | No       | password_file         | Path to file with password to decrypt encrypted exit messages with. Needed only if you have encrypted files in messages directory              |
| BLOCKS_PRELOAD             | No       | 50000                 | Amount of blocks to load events from on start. Increase if daemon was not running for some time. Defaults to a day of blocks |
| BLOCKS_LOOP                | No       | 64                    | Amount of blocks to load events from on every poll. Defaults to 2 epochs                                                     |
| JOB_INTERVAL               | No       | 384000                | Time interval in milliseconds to run checks. Defaults to time of 1 epoch                                                     |
| HTTP_PORT                  | No       | false                 | Port to serve metrics and health check on                                                                                    |
| RUN_METRICS                | No       | false                 | Enable metrics endpoint                                                                                                      |
| RUN_HEALTH_CHECK           | No       | false                 | Enable health check endpoint                                                                                                 |
| LOGGER_LEVEL               | No       | info                  | Severity level from which to start showing errors eg info will hide debug messages                                           |
| LOGGER_FORMAT              | No       | simple                | Simple or JSON log output: simple/json                                                                                       |
| LOGGER_SECRETS             | No       | ["secret","secret"]   | String array of exact secrets to sanitize in logs                                                                            |
| LOGGER_SECRETS_FILE        | No       | secret_file           | Path to file with json string array of exact secrets to sanitize in logs                                                                            |
| LOGGER_HIDDEN_ENV          | No       | ["MESSAGES_PASSWORD"] | List of environment variables whose values ​​will be hidden from logging                                                                            |
| DRY_RUN                    | No       | false                 | Run the service without actually sending out exit messages                                                                   |

## Setting access to AWS S3 and GCS

To connect to GCS is used [ADC](https://cloud.google.com/docs/authentication/application-default-credentials#attached-sa)

To connect to AWS S3 is used [Setting credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)

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

- exit_messages: ['valid'] - Exit messages and their validity: JSON parseability, structure and signature. Already exiting(ed) validator exit messages are not counted
- exit_actions: ['result'] - Statuses of initiated validator exits
- polling_last_blocks_duration_seconds: ['eventsNumber'] - Duration of pooling last blocks in microseconds
- execution_request_duration_seconds: ['result', 'status', 'domain'] - Execution node request duration in microseconds
- consensus_request_duration_seconds: ['result', 'status', 'domain'] - Consensus node request duration in microseconds
- job_duration_seconds: ['name', 'interval', 'result'] - Duration of cron jobs

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

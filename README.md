<img src="https://user-images.githubusercontent.com/4752441/209329469-aee5d699-af5e-467b-9213-4d09b1a22012.png" width="50%" height="50%">

# Lido Validator Ejector

Daemon service which loads LidoOracle events for validator exits and sends out exit messages when necessary.

On start, it will load events from a configurable amount of blocks behind and then poll for new events.

## Requirements

- Folder of pre-signed exit messages as individual json files in either spec format or [ethdo output format](https://github.com/wealdtech/ethdo/blob/master/docs/usage.md#exit)
- Execution node
- Consensus node

This service has to be run in a single instance as it expects to fulfil every request to exit. Each unfulfilled request (no exit message being present for required validator) will log an error.

## Configuration

Options are configured via environment variables.

Required:

- EXECUTION_NODE=http://1.2.3.4:8545
- CONSENSUS_NODE=http://1.2.3.4:5051
- CONTRACT_ADDRESS=0x596BBA96Fa92e0A3EAf2ca0B157b06193858ba5E - Address of the ValidatorExitBus contract, can be found in the [lido-dao repo](https://github.com/lidofinance/lido-dao)
- STAKING_MODULE_ID=123 - Staking Module ID for which operator ID is set
- OPERATOR_ID=123 - Operator ID in the Node Operators registry, easiest to get from [Operators UI](https://operators.lido.fi)
- MESSAGES_LOCATION=messages - Folder to load json exit message files from

Optional:

- MESSAGES_PASSWORD - Password to decrypt encrypted exit messages with. Needed only if you have encrypted files in messages directory.
- BLOCKS_PRELOAD=7200 - Amount of blocks to load events from on start. Increase if daemon was not running for some time. Defaults to a day of blocks
- BLOCKS_LOOP=32 - Amount of blocks to load events from on every poll. Defaults to 1 epoch
- JOB_INTERVAL=384000 - Time interval in milliseconds to run checks. Defaults to time of 1 epoch
- HTTP_PORT=false - Port to serve metrics and health check on
- RUN_METRICS=false - Enable metrics endpoint
- RUN_HEALTH_CHECK=false - Enable health check endpoint
- LOGGER_LEVEL=info - Severity level from which to start showing errors eg info will hide debug messages
- LOGGER_FORMAT=simple - Simple or JSON log output: simple/json
- LOGGER_SECRETS=[] - String array of exact secrets to sanitize in logs
- DRY_RUN=false - Run the service without actually sending out exit messages

## Running

Either:

- Use Docker image from Docker Hub: TODO
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

Enable metrics endpoint via RUN_METRICS=true and METRICS_PORT=1234 environment variables.

Metrics will be available on `$HOST:$METRICS_PORT/metrics`.

Available metrics:

- exit_messages: ['valid'] - Exit messages and their validity: JSON parseability, structure and signature. Already exiting(ed) validator exit messages are not counted
- exit_actions: ['result'] - Statuses of initiated validator exits
- polling_last_blocks_duration_seconds: ['eventsNumber'] - Duration of pooling last blocks in microseconds
- execution_request_duration_seconds: ['result', 'status', 'domain'] - Execution node request duration in microseconds
- consensus_request_duration_seconds: ['result', 'status', 'domain'] - Consensus node request duration in microseconds
- job_duration_seconds: ['name', 'interval', 'result'] - Duration of cron jobs

## Safety Features

- Invalid files in messages folder are noticed
- Exit JSON structure is checked
- Exit signature is fully validated
- Node requests are repeated on error or timeouts
- Amount of messages left to send out can be checked using metrics
- Dry run mode to test setup

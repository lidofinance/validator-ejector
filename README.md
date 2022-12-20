<img src="https://user-images.githubusercontent.com/4752441/206219523-2f815649-12dc-45af-8393-e27a96dcc19a.png" width="50%" height="50%">

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
- OPERATOR_ID=123 - Operator ID in the Node Operators registry, easiest to get from [Operators UI](https://operators.lido.fi)
- MESSAGES_LOCATION=messages - Folder to load json exit message files from

Optional:

- BLOCKS_PRELOAD=10000 - Amount of blocks to load events from on start. Increase if daemon was not running for some time
- BLOCKS_LOOP=100 - Amount of blocks to load events from on every poll
- JOB_INTERVAL=20000 - Time interval to run checks

- RUN_METRICS=false - Enable metrics endpoint
- RUN_HEALTH_CHECK - Enable health check endpoint
- HTTP_PORT - Port to serve metrics and health check

- LOGGER_LEVEL=info - Severity level from which to start showing errors eg info will hide debug messages
- LOGGER_PRETTY=true - Inline formatting log messages instead of JSON log output

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

- TODO

## Safety Features

- Invalid files in messages folder are noticed
- Exit JSON structure is checked
- Exit signature is fully validated
- Node requests are repeated on error or timeouts
- Amount of messages left to send out can be checked using metrics
- Dry run mode to test setup

import { obj, str } from 'lido-nanolib'

export const genesisDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        genesis_time: str(data.genesis_time, 'Invalid genesis_time input'),
        genesis_validators_root: str(
          data.genesis_validators_root,
          'Invalid genesis_validators_root input'
        ),
        genesis_fork_version: str(
          data.genesis_fork_version,
          'Invalid genesis_fork_version input'
        ),
      })),
    }),
    'Invalid validator Genesis response'
  )

export const stateDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        previous_version: str(
          data.previous_version,
          'Invalid previous_version input'
        ),
        current_version: str(
          data.current_version,
          'Invalid current_version input'
        ),
        epoch: str(data.epoch, 'Invalid epoch input'),
      })),
    }),
    'Invalid validator State response'
  )

export const validatorInfoDTO = (json: unknown) =>
  obj(
    json,
    (json) => ({
      data: obj(json.data, (data) => ({
        index: str(data.index, 'Invalid validator index'),
        status: str(data.status, 'Invalid status'),
        validator: obj(data.validator, (validator) => ({
          pubkey: str(validator.pubkey, 'Invalid pubkey'),
        })),
      })),
    }),
    'Invalid validator info response'
  )

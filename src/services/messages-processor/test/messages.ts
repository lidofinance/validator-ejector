import type { MessageFile } from '../../local-file-reader/service.js'

// validator fake key created for tests
export const VALIDATOR_PUB_KEY =
  '0x970d7295d60f14c76937487dd14e4b792fdf1e2e3510ba8b0531a5ec2a4ccf6ab4f9b352d2a71f2861b509dddaeaa271'

export const VALIDATOR_INDEX = '828943'

export const EPOCH = '28624'

// validator exit message created for tests
export const CAPELLA_MESSAGE: MessageFile = {
  filename: 'capella.json',
  content: JSON.stringify({
    message: { epoch: EPOCH, validator_index: VALIDATOR_INDEX },
    signature:
      '0xa7e459f559b16c4a6fa9184612a09dfcb8fed6b605c5e7228c66d73ac0cea80524a4e516592759596518d5c4873e9aef00d1a961b111233b38aa5455459a6b82882605df9f5a3e1429aa9c542204a7cf5c18c7935d98cbf534afc42e5c6c8617',
  }),
}

// validator exit message created for tests
export const BELLATRIX_MESSAGE: MessageFile = {
  filename: 'bellatrix.json',
  content: JSON.stringify({
    message: { epoch: EPOCH, validator_index: VALIDATOR_INDEX },
    signature:
      '0x87149c0e94e01d855f1d48f9456146ee5c4a48f2ae3499c5b294a46d18a3fe628a19c1fe35a5224818fb52287baa45ab1550b611c462453f0d3e3b7117d34bce5825480854678f35f35990392e8e6eeca5c5db01d1819296f55c535cf933922c',
  }),
}

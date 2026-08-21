# [2.2.0](https://github.com/lidofinance/validator-ejector/compare/2.1.0...2.2.0) (2026-08-21)


### Bug Fixes

* eslint errors ([763af0f](https://github.com/lidofinance/validator-ejector/commit/763af0f8621b6c46d28e4d21b67cd30b2d0fef01))
* restore Node 16 build and isolate Hardhat e2e dependency ([8560dde](https://github.com/lidofinance/validator-ejector/commit/8560dde93c063d12adf98b12af4beb6d29c20888))
* update commit hash and bytecode in delegation contract fixture ([88b124e](https://github.com/lidofinance/validator-ejector/commit/88b124ef0b6a9e0bea462f9f7c9805d30102a476))


### Features

* add JWT support for execution request headers and enhance config handling ([7f629b5](https://github.com/lidofinance/validator-ejector/commit/7f629b51746ec184d27e734ad6c6979f7b2b73ea))
* **config:** add LOAD_LOGS_STEP configuration with defaults and validation tests ([0c14c83](https://github.com/lidofinance/validator-ejector/commit/0c14c83efcb20b58716cdbb0fdc4eb992270a87e))
* edf ([a2fcc57](https://github.com/lidofinance/validator-ejector/commit/a2fcc5711e3f1ab05e93f4ca3fb74290cb64ee61))
* enhance exit request handling and add transaction allowlist verification ([5b2f3b5](https://github.com/lidofinance/validator-ejector/commit/5b2f3b5d6053f4e051c40b572a7b8a537f966448))
* **logs:** implement LOAD_LOGS_STEP for chunked log retrieval and update documentation ([0a0cec2](https://github.com/lidofinance/validator-ejector/commit/0a0cec28b39e1e6fcb4f5f069a2105bbf94e6335))
* remove unused EASY_TRACK_MOTION_CREATOR_ADDRESSES_ALLOWLIST and simplify getLogs call ([550feb9](https://github.com/lidofinance/validator-ejector/commit/550feb9e3bf1e0102c5106b7872f22ac63b3f581))
* rework tx verify ([d7f18cf](https://github.com/lidofinance/validator-ejector/commit/d7f18cf62e738333393de33b5122039983e3848b))
* update execution node fallback ([131c284](https://github.com/lidofinance/validator-ejector/commit/131c284169d93c8144c6ce43e28cacfc5db951e6))
* upgrade Node.js version to 22 in workflows and Dockerfile ([7704676](https://github.com/lidofinance/validator-ejector/commit/770467669d006d0669bf9fe685f8a2934a28ac91))
* **webhook:** add bearer token auth via WEBHOOK_TOKEN or WEBHOOK_TOKEN_FILE ([feacda8](https://github.com/lidofinance/validator-ejector/commit/feacda8a51547a197080729881c2cbe3432ba84b))
* **webhook:** allow custom auth header via WEBHOOK_HEADER ([731c54d](https://github.com/lidofinance/validator-ejector/commit/731c54d1a5c5ed85e0bbf4e3557f3d4910917df4))



# [2.1.0](https://github.com/lidofinance/validator-ejector/compare/1.9.0...2.1.0) (2026-05-26)


### Bug Fixes

* update documentation for environment variables to clarify logging and event handling ([d93b9de](https://github.com/lidofinance/validator-ejector/commit/d93b9de0bfcde484299f7b101340b241e530120e))
* update nock configuration to use the first URL from the consensus and execution nodes ([f985420](https://github.com/lidofinance/validator-ejector/commit/f9854205298520a8e51ea6e07187ece9296943d4))
* update Node.js version in workflow files ([7b5f682](https://github.com/lidofinance/validator-ejector/commit/7b5f682f5a5ab34264b5ab641ea5d449d525a8eb))


### Features

* add EJECTOR_SCOPE to сompose and stakingModuleId to eject logs ([4f3b514](https://github.com/lidofinance/validator-ejector/commit/4f3b51483cf1f85fb610c371851e65b014780043))
* add support for multiple staking modules in configuration and services ([853ea0b](https://github.com/lidofinance/validator-ejector/commit/853ea0bcf150184f299e66a97339e12739c5f3cb))
* add VALIDATORS_BATCH_SIZE configuration and update related logic in services and tests ([d364c68](https://github.com/lidofinance/validator-ejector/commit/d364c6895558bb9e61cb8d25b8508863bcb50b82))
* **consistency:** chain-id consistency check at startup ([0da3ca8](https://github.com/lidofinance/validator-ejector/commit/0da3ca82c7f43df363789fbe34932acf6958e5cd))
* **el:** treat JSON-RPC server errors as fallbackable ([14305ba](https://github.com/lidofinance/validator-ejector/commit/14305baa905d951b2d1e107b8ef7665632576dcc))
* enhance error handling and logging for HTTP requests, including retry logic for transient errors ([22b710c](https://github.com/lidofinance/validator-ejector/commit/22b710cf1c2cffe05d9fb0db0064a9216d2c2ec6))
* enhance error handling in JSON parsing ([3a36f62](https://github.com/lidofinance/validator-ejector/commit/3a36f629aa65495efe586e0fd577a0f05599727d))
* enhance logger configuration to normalize and redact multi-url secrets in logs ([9649fd4](https://github.com/lidofinance/validator-ejector/commit/9649fd4d11bf7a3fc381d4b2454fb1a2612f51fe))
* enhance testing setup with new e2e configurations ([94cbb65](https://github.com/lidofinance/validator-ejector/commit/94cbb655ddd719917c644e420e11aea81a99ea7e))
* **exit-logs:** plumb VOTING_EVENTS_FRAME_BLOCKS through from config ([d64de93](https://github.com/lidofinance/validator-ejector/commit/d64de93f88ec523576a505c1269ce7b4b9395cfa))
* **fallback:** include URL index in fallback log lines ([cd6d284](https://github.com/lidofinance/validator-ejector/commit/cd6d284884fe33474534f76c458d80fe9609f822))
* **fallback:** preserve every per-endpoint cause via AggregateError ([4ef76c0](https://github.com/lidofinance/validator-ejector/commit/4ef76c0f65c6e0e5b135bb61af36e70f60c33ced))
* implement batch fetching of validator info and update tests ([0d07afc](https://github.com/lidofinance/validator-ejector/commit/0d07afc4cba511c51f8ca0706c16d969b367ac38))
* implement EJECTOR_SCOPE for multi-module support and refactor related configurations and services ([3bed896](https://github.com/lidofinance/validator-ejector/commit/3bed896c7b86419fae078e0c0ae1d8d2a29d2822))
* improve validation for boolean config options in makeConfig ([b7a6401](https://github.com/lidofinance/validator-ejector/commit/b7a64018c4e3b58e79cd8abb893793eb5305277e))
* introduce JsonRpcServerError for improved error handling and update related logic in execution API ([c48ac53](https://github.com/lidofinance/validator-ejector/commit/c48ac53d5609d0e568f61e547e6545550d292043))
* **rpc:** introduce url_list validator and string[] node config ([a6638f9](https://github.com/lidofinance/validator-ejector/commit/a6638f9644d25b04ec16c2e90fe9eb7986d6c16e))
* **scripts:** manual fallback e2e harness ([a8dd27c](https://github.com/lidofinance/validator-ejector/commit/a8dd27c108f3452a19c895be1805c9b87f56307a))
* update configuration for EJECTOR_SCOPE and deprecate legacy options in environment files ([eee66dd](https://github.com/lidofinance/validator-ejector/commit/eee66dd20668149b84b50ab5c5a90a3111659f33))
* update version to 2.0.0 in package.json ([87cf864](https://github.com/lidofinance/validator-ejector/commit/87cf86457d4b29080fc730fb5761bbb377883218))



# [1.9.0](https://github.com/lidofinance/validator-ejector/compare/1.8.0...1.9.0) (2025-08-21)


### Features

* **orc-409:** add more context for error when ValidatorExitRequest was emitted by unknown contract function ([585e3bf](https://github.com/lidofinance/validator-ejector/commit/585e3bf63b887a3d31826895472daf7156cdb589))
* **orc-409:** add tests ([dba9b55](https://github.com/lidofinance/validator-ejector/commit/dba9b55a4b21c6c57b9b3ed74f5e1d527f0acf5b))
* **orc-409:** add validation for getLogs ([1015c93](https://github.com/lidofinance/validator-ejector/commit/1015c93a693aaa7cdf6be1ac1fe6a017f66e4a31))
* **orc-409:** add withdrawal via voting contracts ([3d06ee6](https://github.com/lidofinance/validator-ejector/commit/3d06ee676538f63b17e4f058bdccaf282dd92eae))
* **orc-409:** make EASY_TRACK_ADDRESS env optional ([8ad400d](https://github.com/lidofinance/validator-ejector/commit/8ad400d7d08601852c914b6221a320d0c26f4724))
* **orc-409:** refact voting events fetching ([80d60a4](https://github.com/lidofinance/validator-ejector/commit/80d60a43c835954ced9968502500d495b7af6f95))
* **orc-409:** rename VOTING_WITHDRAWAL_TRANSACTIONS_ALLOWLIST to SUBMIT_TX_HASH_ALLOWLIST ([7b9bd70](https://github.com/lidofinance/validator-ejector/commit/7b9bd70dd733ccef4d1e2da4b8d3aba3e16be61f))
* **orc-409:** replace DISABLE_SECURITY_DONT_USE_IN_PRODUCTION with TRUST_MODE ([4480e87](https://github.com/lidofinance/validator-ejector/commit/4480e87da11f57543586be7abddec41dda6e2ddb))
* **orc-409:** update readme ([9c759c1](https://github.com/lidofinance/validator-ejector/commit/9c759c1f54499baaa8fa0aec6c467faa300033ac))
* **orc-413:** add state param to getExitingValidatorsCount, and improve test ([6659870](https://github.com/lidofinance/validator-ejector/commit/66598701277a089e6e335a85d3591bce6fd8a065))
* **orc-413:** refact loop to filter ([2b3de06](https://github.com/lidofinance/validator-ejector/commit/2b3de064bcf2c1095b6e2041116f0c34f074e5ee))
* **orc-413:** remove lastRequestedValidatorIndex ([7700ffc](https://github.com/lidofinance/validator-ejector/commit/7700ffcf756f82860698f67886068dbd0bb2b79c))
* **orc-413:** Updating exit messages left metrics from validator statuses ([e750fb3](https://github.com/lidofinance/validator-ejector/commit/e750fb3194d1d297b1ce7b3093ecd796caa60e6e))
* **orc-428:** add getValidatorExitRequestEvents method ([36f3927](https://github.com/lidofinance/validator-ejector/commit/36f39272fd5f5d658a35f1c7a43a65d446938ce9))
* **orc-428:** add JobProcessor integration tests ([2470bd8](https://github.com/lidofinance/validator-ejector/commit/2470bd8df99e622d3a3b3e246dc20c9c335efb84))
* **orc-428:** add stricter typing to fetchValidatorsBatch ([097e3f9](https://github.com/lidofinance/validator-ejector/commit/097e3f93e32e5527ddfdc08ca47139e2b8b15323))
* **orc-428:** add validatePublicKeys to cl, use validatePublicKeys inside fetcher ([719f642](https://github.com/lidofinance/validator-ejector/commit/719f64204472d9e99489e05d69e2d749b6f22fa4))
* **orc-428:** added EASY_TRACK_FRAME_BLOCKS + pre-uploading of voting-based events ([ae140cb](https://github.com/lidofinance/validator-ejector/commit/ae140cb56d14f73a0aef01d9868d3ede3baceb25))
* **orc-428:** Aragon case fix ([b1f25ad](https://github.com/lidofinance/validator-ejector/commit/b1f25adef148c0db3fa892085956e511be2d49a8))
* **orc-428:** extract fetchValidatorsBatch method ([d156820](https://github.com/lidofinance/validator-ejector/commit/d1568203f4a9dff248167bca9d4c0d9d82e1306c))
* **orc-428:** remove unnecessary types casting ([16691d9](https://github.com/lidofinance/validator-ejector/commit/16691d91da1e1b81b35cdf52a6ae2ddb40ac88ef))
* **orc-428:** replace isExiting with batching ([4451aef](https://github.com/lidofinance/validator-ejector/commit/4451aef9a3a5f62b466bc34f364a25af7101558f))
* **orc-431:** fix endpoint according to Nethermind ([2bf533f](https://github.com/lidofinance/validator-ejector/commit/2bf533f1cf9a1ba563bc70ee6699ea32630ae19f))
* **orc-445:** Raise error instead of return currentBlock != highestBlock in syncingDTO ([44105ac](https://github.com/lidofinance/validator-ejector/commit/44105acfefc072b1a2744351801b5cb007e038fd))
* **orc-448:** .github/PULL_REQUEST_TEMPLATE.md added ([7a9cf64](https://github.com/lidofinance/validator-ejector/commit/7a9cf64147de286d3a06296aa23d87cb6a133a2c))
* **orc-448:** add test to new logic ([88295d5](https://github.com/lidofinance/validator-ejector/commit/88295d55f652d1c1e460e0feecd25dad0802813f))
* **orc-448:** add verifyTransactionIntegrity ([b49afc0](https://github.com/lidofinance/validator-ejector/commit/b49afc048a6877747adf1919d82e21b7675a39ae))
* **orc-448:** fix contract abi ([65af229](https://github.com/lidofinance/validator-ejector/commit/65af229ea760505e101383872c0710bf47bd37e2))
* **TW:** add legacy type transactions support to recoverAddress ([7c0dd15](https://github.com/lidofinance/validator-ejector/commit/7c0dd152b0a844e7b585a5bf1cb61de4951db19e))
* **TW:** add type-0 transaction support for SUBMIT_TX_HASH_ALLOWLIST ([660550e](https://github.com/lidofinance/validator-ejector/commit/660550e6cc7caee890acdedd4241081eab6f59a2))
* **TW:** introduce validateTransactionType method ([c62f5dd](https://github.com/lidofinance/validator-ejector/commit/c62f5dd2fdb043a316ececb848b0c3a004d49e40))
* **TW:** refactor ([3eaf2f6](https://github.com/lidofinance/validator-ejector/commit/3eaf2f6ce57fb17d8231d4dd6fc0eaac6d605ab6))



# [1.8.0](https://github.com/lidofinance/validator-ejector/compare/1.7.0...1.8.0) (2025-05-12)


### Bug Fixes

* add comment for future use of baseUrl in the balancer mechanism ([b1c7c71](https://github.com/lidofinance/validator-ejector/commit/b1c7c7101e2a38e82d28d79cc20a31c8cd6bc617))
* add comment to clarify the number of blocks for ConsensusReached event search ([1bbadbb](https://github.com/lidofinance/validator-ejector/commit/1bbadbb9e5415b39a8e41ee29b3ace56f8febc4f))
* change chain_id type from number to string in depositContractSchema ([4e0d5cc](https://github.com/lidofinance/validator-ejector/commit/4e0d5ccdcc4b2cf4f36118923fdda4e1d068e32f))
* correct date formatting to use UTC in logger ([7cbab24](https://github.com/lidofinance/validator-ejector/commit/7cbab24a408daba2e1aa1af810a670242b322238))
* correct debug color comment and enhance error logging for JSON response parsing ([e3933ed](https://github.com/lidofinance/validator-ejector/commit/e3933ed32d24ecb07fe7feb2aefdfd16949a58fc))
* correct typo in README for polling_last_blocks_duration_seconds metric description ([893db2d](https://github.com/lidofinance/validator-ejector/commit/893db2d1468cc2b6afd8803b5ace3535c6f7a675))
* enhance error logging for transaction report hash lookup and data hash mismatch ([7853abb](https://github.com/lidofinance/validator-ejector/commit/7853abb7aff1a2b7dd8ad3f5b8273a771a216dec))
* ensure remoteChainId is compared as a number in print-capella-fork-versions script ([d42b438](https://github.com/lidofinance/validator-ejector/commit/d42b438a589d3cecb50d1f297b292ceceec753b0))
* increase test timeout to 10 minutes for improved test execution ([a82c731](https://github.com/lidofinance/validator-ejector/commit/a82c7314b9fe917a6979e04477867896c92372d5))
* reduce LRU cache size for transaction and consensus logs to optimize memory usage ([3f06c9d](https://github.com/lidofinance/validator-ejector/commit/3f06c9daa486b12b3e53683bba94fd3ed2cb744d))
* remove BLOCKS_LOOP configuration option from README and service ([cc50332](https://github.com/lidofinance/validator-ejector/commit/cc50332b83fb294286dc446c282e3fb3d9806608))
* remove lido-nanolib dependency ([2ef1409](https://github.com/lidofinance/validator-ejector/commit/2ef14093f224b742e496edd06987952120b3f269))
* remove unused getLastFromCache method from exit logs cache service ([f0e1c49](https://github.com/lidofinance/validator-ejector/commit/f0e1c492aee7f77c466a5bf8a3a406f9c4165210))
* rename logs function to getLogs for clarity and consistency ([b33856e](https://github.com/lidofinance/validator-ejector/commit/b33856ec97db80639d9daf640f796e0a308cd317))
* replace LRUCache implementation with lru-cache package and update usage ([3bff5b6](https://github.com/lidofinance/validator-ejector/commit/3bff5b637742a0ea8ee71d0f90c764d97c1e9f66))
* rollback dockerfile changes ([f793d8d](https://github.com/lidofinance/validator-ejector/commit/f793d8d7070dce898df325625ca4302de5981bae))
* set package as private and upgrade vite version to 6.2.0 ([4c462d3](https://github.com/lidofinance/validator-ejector/commit/4c462d348356ba9589dff639112758acd3433953))
* simplify cached logs check by removing redundant condition ([96fbf0b](https://github.com/lidofinance/validator-ejector/commit/96fbf0bc8661a8a4110a68b0dc721989661caa84))
* ts-node dev mode ([af34230](https://github.com/lidofinance/validator-ejector/commit/af3423077c04a9f7356d6bfbb74334667da7f099))
* unify operator identification handling by replacing OPERATOR_IDENTIFIERS with OPERATOR_IDS ([1aa88db](https://github.com/lidofinance/validator-ejector/commit/1aa88dbedcb6a093152ca15bbd4a2400720e53ab))
* update debug log color to blue in logger printer ([df3ec06](https://github.com/lidofinance/validator-ejector/commit/df3ec06afc8d4600ae7176d857203b22a45eb279))
* update exit logs cache header initialization and adjust related tests for consistency ([e0715a0](https://github.com/lidofinance/validator-ejector/commit/e0715a0684baf8ccbe0ffc48e11a7fd6f12ef118))
* update exit logs tests to use hardcoded mainnet block numbers with added documentation ([abeffc1](https://github.com/lidofinance/validator-ejector/commit/abeffc1ad652dc3c50b4944408da538506106199))
* update exitLogs tests to use environment variables for node configuration and sanitize secrets ([9fb54a5](https://github.com/lidofinance/validator-ejector/commit/9fb54a5ee26281c1e2e57a878ee4d50531181a22))
* update JWT implementation to generate new token per request ([e9a61b7](https://github.com/lidofinance/validator-ejector/commit/e9a61b75c1854e85f26989b8e646240e6e685c33))
* update nock dependency version to remove caret for consistency ([d758912](https://github.com/lidofinance/validator-ejector/commit/d758912569c60bbf07661213cee2360ff92ddd63))
* update public execution node URL ([bc3bf63](https://github.com/lidofinance/validator-ejector/commit/bc3bf63e6d00e7693a5e3f5cd50fd14a8c94b44b))
* upgrade vitest version to 3.0.7 in package.json ([11f1d38](https://github.com/lidofinance/validator-ejector/commit/11f1d3880e0a2cbf7e4038bc2b00f0a25fa99b27))


### Features

* add base end-to-end tests for exit logs service and increase test timeout ([3a9c084](https://github.com/lidofinance/validator-ejector/commit/3a9c0847e3ec40a77bf6b2ac6fc1a4b1cfbc5690))
* add support for multiple operator identifiers in configuration ([8e1f13a](https://github.com/lidofinance/validator-ejector/commit/8e1f13ab4520e5c4e81505c7351a9a3c37619beb))
* enable exitLogs e2e tests and enhance test timeout for improved reliability ([037daec](https://github.com/lidofinance/validator-ejector/commit/037daec78b721f993bf1b225cdfcc07fe0d6c6e3))
* enhance configuration validation for OPERATOR_ID and OPERATOR_IDENTIFIERS ([d515b7c](https://github.com/lidofinance/validator-ejector/commit/d515b7c080a8c9564bf56ae49c6c96574b5c1192))
* enhance error handling by adding safelyParseJsonResponse for CL API responses ([2970441](https://github.com/lidofinance/validator-ejector/commit/2970441232dab7ea5672fd1c81f739ba26cc3950))
* enhance exit logs processing by adding node operator ID and acknowledgment handling ([df4168d](https://github.com/lidofinance/validator-ejector/commit/df4168d8fef7ac89ad815fcc2b206c82c37d972d))
* enhance logging with heap size limit and fetch time metrics in app service ([cb32e8e](https://github.com/lidofinance/validator-ejector/commit/cb32e8ebd6712dcf888666ffe6045bd1914abcf8))
* implement exit logs caching and fetching service with types ([eb1d3a6](https://github.com/lidofinance/validator-ejector/commit/eb1d3a6b72bf3835c9c4054af00bff8d13e05c67))
* implement exit logs service with fetcher and DTOs ([1662670](https://github.com/lidofinance/validator-ejector/commit/16626705e1d1a0ee9993610a44faed8a89a3dd75))
* implement LRUCache class with basic operations and tests ([8a115e8](https://github.com/lidofinance/validator-ejector/commit/8a115e87f47d8c75d74d6ebc6179d6c80b76dbc2))
* initial refactoring ([f1c13af](https://github.com/lidofinance/validator-ejector/commit/f1c13af744a63631059320272a6619442f8d1203))
* integrate exit logs service into job processor and application module ([d7a3be4](https://github.com/lidofinance/validator-ejector/commit/d7a3be418c8b66e04d3f8eae3c12d7b0f89da051))
* refactor config to zod ([dd3e8be](https://github.com/lidofinance/validator-ejector/commit/dd3e8bebd1514d3835ef3b1bedecdb6fd6ce63f5))
* refactor dto ([d920dca](https://github.com/lidofinance/validator-ejector/commit/d920dcabff89ac6628f708d4a66ae407ceadc1a5))
* refactor exit logs service and add logs fetching method in execution API ([6090312](https://github.com/lidofinance/validator-ejector/commit/60903128a4e07a4871cf9047e509875f720b2eaf))
* rename pooling method to loop and update job execution logic ([e18c0f7](https://github.com/lidofinance/validator-ejector/commit/e18c0f7df43fc836c3a9a3d42192e6d740148200))
* simplify exit logs service initialization and enhance JSON response handling ([e1caed4](https://github.com/lidofinance/validator-ejector/commit/e1caed48701d8307b5888ba609e03238dbbd9c3d))
* update exit logs fetching to include last block number and improve operator ID handling ([f23d920](https://github.com/lidofinance/validator-ejector/commit/f23d920f20bb44ef771be6098a5441fecfa372a2))
* update job processing logic to acknowledge events based on finalized state ([7a51d3d](https://github.com/lidofinance/validator-ejector/commit/7a51d3d148f09797107b6cf1eb9b55830900ae4a))
* workflows for hoodi/holesky deployment ([4f9115b](https://github.com/lidofinance/validator-ejector/commit/4f9115bc914a715462dfb2916f7b9ceea8a59b36))



# [1.7.0](https://github.com/lidofinance/validator-ejector/compare/1.6.0...1.7.0) (2025-03-20)


### Bug Fixes

* Capella fork version retrieval logic ([0dc6173](https://github.com/lidofinance/validator-ejector/commit/0dc617320cbca9539695418a85441bf739ef0917))


### Features

* add CAPELLA_FORK_VERSION configuration option and validation ([01bb8d9](https://github.com/lidofinance/validator-ejector/commit/01bb8d952d7f8c7b81ecab5acbfa17b2a9936a1c))
* add HOODI chain and Capella fork version ([2bfeda0](https://github.com/lidofinance/validator-ejector/commit/2bfeda019a34aa51fac82ac23ac1d86898d3ce7b))



# [1.6.0](https://github.com/lidofinance/validator-ejector/compare/1.5.0...1.6.0) (2024-04-17)


### Bug Fixes

* add webhook config description ([f27cc64](https://github.com/lidofinance/validator-ejector/commit/f27cc648afaf425e7666fa6d58a0df13e5d66dd9))
* bump package json version ([c7590df](https://github.com/lidofinance/validator-ejector/commit/c7590df307c9fc6a0428eabf2c3069411c7136a7))
* incorrect link to Releases GitHub page ([c2e1261](https://github.com/lidofinance/validator-ejector/commit/c2e1261a6743dc32e9fbd28de828564c98e5b409))
* lint errors ([d6ef9de](https://github.com/lidofinance/validator-ejector/commit/d6ef9dedd02bce529af2ea1a540368dc1c1412c9))


### Features

* add new metric with package version ([3584591](https://github.com/lidofinance/validator-ejector/commit/3584591bb1bacd69f4b712157b1831a349885bf1))



# [1.5.0](https://github.com/lidofinance/validator-ejector/compare/1.4.0...1.5.0) (2024-02-19)


### Bug Fixes

* add FORCE_DENCUN_FORK_MODE to docs ([5685986](https://github.com/lidofinance/validator-ejector/commit/5685986d3cba9bd4d6e048c44e63b7aacb649dc9))


### Features

* enabling dencun checks by env ([cf9192c](https://github.com/lidofinance/validator-ejector/commit/cf9192c17f4f6ae0a7e950f20de3659525812319))



# [1.4.0](https://github.com/lidofinance/validator-ejector/compare/1.3.0...1.4.0) (2024-02-15)


### Bug Fixes

* deleted the unnecessary validation log ([99b005e](https://github.com/lidofinance/validator-ejector/commit/99b005ed3118af663cc282e8fd33ac58ace152ba))
* enable validation for mainnet ([a5e3e12](https://github.com/lidofinance/validator-ejector/commit/a5e3e121d5aeff9746e4b0c4f8999810406f9a14))
* move progress logs to the debug level ([5eb31e4](https://github.com/lidofinance/validator-ejector/commit/5eb31e44d66767169731cc5c287ac2579bfd806b))
* nock spec ([297b266](https://github.com/lidofinance/validator-ejector/commit/297b2661a92bc12d569282af5b58f1060ba251ca))
* remove unused fixture ([53f323b](https://github.com/lidofinance/validator-ejector/commit/53f323b74ed58efbf320984f204a6d2273960e29))
* removed unnecessary env fields from the validation script configuration ([3adbf22](https://github.com/lidofinance/validator-ejector/commit/3adbf22ed07b2dec335e199709bc5fe437a39db0))
* validation script better logs ([d0ee05f](https://github.com/lidofinance/validator-ejector/commit/d0ee05fea6fd123d20f1cccbc371aa1eb2430a3c))


### Features

* basic tests fork ([9b527e7](https://github.com/lidofinance/validator-ejector/commit/9b527e7df41ec580dbdc83c9a399bef59f7d1e6b))
* capella fork version script generator for each network ([daf6669](https://github.com/lidofinance/validator-ejector/commit/daf6669b4c67896299ff753ff212e997d289c6bf))
* dencun support ([2106901](https://github.com/lidofinance/validator-ejector/commit/210690129e2d6a2945b11e46eb177fc214703521))
* detailed error message eip-7044 ([3ad868b](https://github.com/lidofinance/validator-ejector/commit/3ad868bc092705d3433335a727270870613e0053))
* getting CAPELLA_FORK_VERSION from constant by chain_id ([26ca5e9](https://github.com/lidofinance/validator-ejector/commit/26ca5e93b071771c56a42144d05b0ec3bc28686f))
* validation script ([19505da](https://github.com/lidofinance/validator-ejector/commit/19505da5a66eadc6a84a6c20a6a9fbcbcf471f78))



# [1.3.0](https://github.com/lidofinance/validator-ejector/compare/1.2.0...1.3.0) (2023-12-07)


### Bug Fixes

* add docs for ARM64 issue ([09f6b43](https://github.com/lidofinance/validator-ejector/commit/09f6b43b252b895afd78aa8b05036646a2ba9781))
* add enum for message reloading ([9eb47b9](https://github.com/lidofinance/validator-ejector/commit/9eb47b9b02a8e8682454b01f92e07a8903ea8590))
* add message reloading ([ad490b8](https://github.com/lidofinance/validator-ejector/commit/ad490b83d66cd2bd55af04520b0787167c381a3e))
* add separate job, add ENV variable to configure message reloader job, add metric for new job, update README ([a50a2ef](https://github.com/lidofinance/validator-ejector/commit/a50a2efb95852f27aa5ec5596ddf181e3ddbc645))
* app spec ([97c815d](https://github.com/lidofinance/validator-ejector/commit/97c815d6813c2a950dcbf23032e5a3421f149588))
* cleaned-up logs ([70d6b52](https://github.com/lidofinance/validator-ejector/commit/70d6b52a1f457b16428e608d32e2380e1215c2c9))
* collect default metrics ([195cc78](https://github.com/lidofinance/validator-ejector/commit/195cc78648ffd8dfa2c2bf0ea39b15a531788c4d))
* fix for message reload job ([8395042](https://github.com/lidofinance/validator-ejector/commit/839504213a6e54f629efa6afe1004b22210fcfef))
* fix for msg removal ([8d9a3e6](https://github.com/lidofinance/validator-ejector/commit/8d9a3e667f417af1ea893dcc2117a06245e8912b))
* improve message reloading ([5e5921a](https://github.com/lidofinance/validator-ejector/commit/5e5921ac2cd0d7698d561d9e1820c1f6cffc5654))
* names fix ([e621a73](https://github.com/lidofinance/validator-ejector/commit/e621a73bc647c08ce4324f36f37b3f0a3f71a77e))
* rename msg load function ([f391c6b](https://github.com/lidofinance/validator-ejector/commit/f391c6bd3507c2b8f78fb1eee36d8ae79ae0611a))
* rollback default metrics handler ([7de4ef6](https://github.com/lidofinance/validator-ejector/commit/7de4ef6ae56770473703c814cc0a469c0eb75c2e))
* simplify expression for message storage ([bcde68e](https://github.com/lidofinance/validator-ejector/commit/bcde68e52896fd9bf087d773becd599a166847ef))
* timer ([8506a05](https://github.com/lidofinance/validator-ejector/commit/8506a052620672af2bff5334ff74552bf5cb1495))


### Features

* add debug log instead of comment ([edbacab](https://github.com/lidofinance/validator-ejector/commit/edbacab7b1564b04336ee482d72057846b42091b))
* app start tests ([37fcfd2](https://github.com/lidofinance/validator-ejector/commit/37fcfd269f83bc4e1b7b22ca6d3a170683538f07))
* cl test ([144a200](https://github.com/lidofinance/validator-ejector/commit/144a200657af08816af2368a42babe9e79432f92))
* link to lido fi ([f24353d](https://github.com/lidofinance/validator-ejector/commit/f24353d5f178242b55d212a5c483d7b570d489a6))
* move to vitetest ([84a362c](https://github.com/lidofinance/validator-ejector/commit/84a362cbb93a14000286491df7889e36ad68fe9c))
* reload messages in each iteration ([daf7ed6](https://github.com/lidofinance/validator-ejector/commit/daf7ed610451f9a8f1d543a7a20bce06b2b6552c))



# [1.2.0](https://github.com/lidofinance/validator-ejector/compare/1.1.0...1.2.0) (2023-04-26)


### Bug Fixes

* prom percentage math ([f9c0beb](https://github.com/lidofinance/validator-ejector/commit/f9c0beb99a8198ff542f980d8c69ceee29bb9a64))
* remove part of help msg in message metric ([ad7dabf](https://github.com/lidofinance/validator-ejector/commit/ad7dabfe076bc5217f9ac3672d787eaaac615bf0))


### Features

* dedicated exit messages left metrics ([c8f6ceb](https://github.com/lidofinance/validator-ejector/commit/c8f6cebbf58726f37858ddfd16f2d664b607a586))




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



# [1.1.0](https://github.com/lidofinance/validator-ejector/compare/ae006433a9e9432b3a948d89884bca0c0b357dbd...1.1.0) (2023-04-21)


### Bug Fixes

* 404 status code ([53712d7](https://github.com/lidofinance/validator-ejector/commit/53712d789ac21642400a291ff418311a4ec6f54f))
* block number in jobs ([524beb3](https://github.com/lidofinance/validator-ejector/commit/524beb3feaf2c9f312653edfb59d09032acbe667))
* check for dir existence in appropriate module ([66e8c9d](https://github.com/lidofinance/validator-ejector/commit/66e8c9d153c7e1b4728fd2d525d6bc20533479ed))
* continue on already exiting validator ([f10ce7f](https://github.com/lidofinance/validator-ejector/commit/f10ce7fd847949dc9169ebb8984e9a1d118a63d6))
* continue on failed exit message DTO ([372763d](https://github.com/lidofinance/validator-ejector/commit/372763db71c830a7020442a3f1942af4ce32cdc8))
* continue on isExiting (code editor lagged) ([c282986](https://github.com/lidofinance/validator-ejector/commit/c282986a54157e964373b277e944071c7f2dab17))
* continue validation on exiting validator ([401288c](https://github.com/lidofinance/validator-ejector/commit/401288cd2963ca4c0ca5830ef8df0acc8125ca27))
* continuing jobs after failed exits ([9128dd3](https://github.com/lidofinance/validator-ejector/commit/9128dd304ce4a0261e460b2f02e4b9d6b2c2dce8))
* correct event loading and return ([599a328](https://github.com/lidofinance/validator-ejector/commit/599a328aeb659a8f28f71861348ac379a58a9443))
* correct logs dto ([6c8bf6e](https://github.com/lidofinance/validator-ejector/commit/6c8bf6ed56dd84df551822fa8eaa338cc16eb1de))
* correct metrics help messages ([6f7f465](https://github.com/lidofinance/validator-ejector/commit/6f7f4653d40d2f0ddcc406047047e10e87716bde))
* correct nanolib string literal checks ([e12e813](https://github.com/lidofinance/validator-ejector/commit/e12e813ba49d52fc325707df03bf529c48009a65))
* correct number parsing ([9642d06](https://github.com/lidofinance/validator-ejector/commit/9642d06b136049a3eb59cd645f59befc0b9d0a49))
* date format ([415b829](https://github.com/lidofinance/validator-ejector/commit/415b8293627469a89aeb95d4f70322ffce9f467a))
* docker-compose file ([ec4a9a7](https://github.com/lidofinance/validator-ejector/commit/ec4a9a7c4f230b163f193092783294ebed967479))
* don't increment metric on non-json files ([08144ed](https://github.com/lidofinance/validator-ejector/commit/08144ed2d381e8b857cd74c449e536b03ce2ea9c))
* dto ([4245b09](https://github.com/lidofinance/validator-ejector/commit/4245b09ad155685ef4d78bce997f2393798f9941))
* esm path lib/ethers ([87e1c92](https://github.com/lidofinance/validator-ejector/commit/87e1c92b9d157e74975630dbb19ae6af8a55490c))
* file reading func ([5edac6e](https://github.com/lidofinance/validator-ejector/commit/5edac6eb9b19d706197a1d6a98824037c50798fc))
* filter arg ([11250f2](https://github.com/lidofinance/validator-ejector/commit/11250f20d9b20dbf439940698988a22d3354d1fc))
* finalized execution client request ([8526e00](https://github.com/lidofinance/validator-ejector/commit/8526e00f214a5902f107624e3f31af54801e8f57))
* fix rebase ([f92b61f](https://github.com/lidofinance/validator-ejector/commit/f92b61f16a5f800561099f36716743f6e06a03db))
* fn name ([e4620bc](https://github.com/lidofinance/validator-ejector/commit/e4620bc151cf8a4d1156ca0d3b706c86984aa72f))
* handle node urls with trailing slash ([8e473f5](https://github.com/lidofinance/validator-ejector/commit/8e473f57eae761eb752a1f4f244d0b36f438093d))
* handle non existing validators ([659a479](https://github.com/lidofinance/validator-ejector/commit/659a479bca2801ebf14b2ba0cca159c9b591f8aa))
* hex block number for logs ([95fe171](https://github.com/lidofinance/validator-ejector/commit/95fe171d258863ed526e3175f32bd8407e114b68))
* http handler exit ([b5b5229](https://github.com/lidofinance/validator-ejector/commit/b5b52295efef149a1550ed3403746e5fba834910))
* increment metric on failed request validation ([75c1422](https://github.com/lidofinance/validator-ejector/commit/75c142290ca2df3eb7ec185d80993312284956d5))
* logger config mapping ([34d6793](https://github.com/lidofinance/validator-ejector/commit/34d6793d57518c95f29747a7e22b8d4f3f3d8b20))
* logger types ([442f3fa](https://github.com/lidofinance/validator-ejector/commit/442f3fa46899e193decd435e12454a37b6f361e8))
* logs ([a543d6b](https://github.com/lidofinance/validator-ejector/commit/a543d6b183e03387e49bbf3cf9a0dc347834ae6f))
* logs ([20f1d44](https://github.com/lidofinance/validator-ejector/commit/20f1d44f7172380e4e7013a8032dd27e7dad45f7))
* mark as invalid already exiting validators ([b332c2a](https://github.com/lidofinance/validator-ejector/commit/b332c2abf57400ab0d377049f1ea00a1f8277772))
* mark messages invalid when isExiting fails ([8e847eb](https://github.com/lidofinance/validator-ejector/commit/8e847ebd20a803dfb9a964155dc75ccad3e69c18))
* metric on exit processing fail ([1375824](https://github.com/lidofinance/validator-ejector/commit/13758240f25d42d52f7ed83d33a7c98434d64827))
* metrics prefix ([e62cc1a](https://github.com/lidofinance/validator-ejector/commit/e62cc1a9fc1163c0ddfb0aea21cbeb495789a344))
* new logger config ([932124e](https://github.com/lidofinance/validator-ejector/commit/932124e8c99d25dc6587b9e0d75c88cd771e82e0))
* optional message password in config ([87cc3e8](https://github.com/lidofinance/validator-ejector/commit/87cc3e8218e94a3bfadd7b6142f1bf1aee5e3395))
* parseInt decimal ([b2fa239](https://github.com/lidofinance/validator-ejector/commit/b2fa23938056d937ad295d1e794adfbd79f182ab))
* POST validator data to the webhook ([09cc49b](https://github.com/lidofinance/validator-ejector/commit/09cc49b702eb5d148535ca63f78fd202f5df7d46))
* proper S3 loading ([f8bf001](https://github.com/lidofinance/validator-ejector/commit/f8bf001b97842cae1b4cdfd83e4a7f13600f364c))
* remove wrap from apis dto ([7bafa17](https://github.com/lidofinance/validator-ejector/commit/7bafa1784d83e927f473fc8b8c50ed5dccf91e7a))
* respecting dry run in all modes ([2b92a7e](https://github.com/lidofinance/validator-ejector/commit/2b92a7ef472cd3b5a87ff5e6e26d823a5303e07d))
* respond to http even with a lot of messages ([c362531](https://github.com/lidofinance/validator-ejector/commit/c36253105b77420d92811e8dc895370c41984c66))
* review ([aef2650](https://github.com/lidofinance/validator-ejector/commit/aef2650db8ec7ac3a9d4b256d8b3dae1c7d43a43))
* run exit method if webhook doesn't exist ([56dbe36](https://github.com/lidofinance/validator-ejector/commit/56dbe36d9ea7a63eaa18252809fd0d5ccdefb3ea))
* sample env file change ([864feac](https://github.com/lidofinance/validator-ejector/commit/864feac2ee496396d50b1f4e06f61b80268154c2))
* sanitize file content in logs ([b20be42](https://github.com/lidofinance/validator-ejector/commit/b20be4206e979996c98f20b1b4ab4ccee0c634c4))
* start script fix ([9d2c850](https://github.com/lidofinance/validator-ejector/commit/9d2c8500a11155ce022e66877d94812df9b77b7a))
* startup config validation with default app logger ([c46ade7](https://github.com/lidofinance/validator-ejector/commit/c46ade73f889c8f7b0e966510f9abcd40e74ca4f))
* strip block number zeros in getLogs ([442a655](https://github.com/lidofinance/validator-ejector/commit/442a655a2de0e64509ba4f5164629d81ba2312d4))
* throw when _FILE is set, but not accessible ([9506a19](https://github.com/lidofinance/validator-ejector/commit/9506a19be9e2aa0f3cc75c7b8ab4dc6ccd4701f7))
* timestamp ([036d546](https://github.com/lidofinance/validator-ejector/commit/036d546251e9ae9748fde563c0054a4a4b21a8c1))
* tooling-nanolib-test - lido-nanolib ([aaadd03](https://github.com/lidofinance/validator-ejector/commit/aaadd03a79faf620b6729178abb0610af22bbe77))
* types ([92f6ebb](https://github.com/lidofinance/validator-ejector/commit/92f6ebba708838321b5a3ddf94b9f6d62beb9269))
* update nanolib to display error causes ([c2364d3](https://github.com/lidofinance/validator-ejector/commit/c2364d363c2a64de00108f5294b351b159c36af4))
* working encryptor ([21533f8](https://github.com/lidofinance/validator-ejector/commit/21533f8c62cf1c0bf4233d03a48b28de5d689dae))


### Features

* abi & refactor index file ([4d14733](https://github.com/lidofinance/validator-ejector/commit/4d14733d589228660d33889f5bcd2473535c521c))
* ability to skip security checks for testnet ([36a744a](https://github.com/lidofinance/validator-ejector/commit/36a744abb7019f6e89f8d246d61eb8d080f99b28))
* abort middleware ([46819fb](https://github.com/lidofinance/validator-ejector/commit/46819fbba9a4c99ae68b16d7275d33016a124e1b))
* add workflows for build and deploy ([a641174](https://github.com/lidofinance/validator-ejector/commit/a641174630cb57e287a8c7709d708381bf0d27c6))
* api lib ([081dfb2](https://github.com/lidofinance/validator-ejector/commit/081dfb2f0e94f0411431142270685434297308cc))
* api response validation ([4aede61](https://github.com/lidofinance/validator-ejector/commit/4aede611532568f230f76bf6ddbc1a5fff7fcc49))
* better error logging ([7223b29](https://github.com/lidofinance/validator-ejector/commit/7223b29485b908d4c1e44b70e26716b3a85db56b))
* better logs ([c5d61b8](https://github.com/lidofinance/validator-ejector/commit/c5d61b80d2d7763821c7e4f964705983c72114ce))
* build ([815019a](https://github.com/lidofinance/validator-ejector/commit/815019a73b8b65794ddb08e5528b848d36532997))
* CI and eslint ([6a62478](https://github.com/lidofinance/validator-ejector/commit/6a624781d2085e13341440d8a5a8942307a4a105))
* complete encryptor script example ([febed3a](https://github.com/lidofinance/validator-ejector/commit/febed3a738be1fe752243b950a0fb9332f46a956))
* dry run mode ([668cd10](https://github.com/lidofinance/validator-ejector/commit/668cd1063ef0be1acfdf84cf797596b0fea33298))
* event validation metric ([b763081](https://github.com/lidofinance/validator-ejector/commit/b763081187d53f30ae1a00310057a375a419171b))
* execution dto ([7b02d2e](https://github.com/lidofinance/validator-ejector/commit/7b02d2e4bd0d4c401b8e767ff11a8be24816fc44))
* exit when can't access messages folder ([1380361](https://github.com/lidofinance/validator-ejector/commit/1380361b6374203556c52b6a7bb4095616a2aaf7))
* exitRequest disable retries ([0e49021](https://github.com/lidofinance/validator-ejector/commit/0e490214459c22315189a8110be63c40394b52d2))
* file parsing progress ([c8e4177](https://github.com/lidofinance/validator-ejector/commit/c8e41779a962621b0b57d744d2cda05f17422b69))
* fix dep versions ([0c21657](https://github.com/lidofinance/validator-ejector/commit/0c2165716e2b69f03ac4ee2f12ad8f48ca8f484e))
* from native fetch to fetch-node ([17747d4](https://github.com/lidofinance/validator-ejector/commit/17747d4811a2f7430ab0bfdb8cf51adac2da0cc3))
* further log improvements ([d7010ef](https://github.com/lidofinance/validator-ejector/commit/d7010ef6acefbcdbd457f41283d50d4a03a133a3))
* health check ([f8405a2](https://github.com/lidofinance/validator-ejector/commit/f8405a2aebe3cab61b7b95217007f01ad0f8cdce))
* ignore and warn about non-json files ([7914250](https://github.com/lidofinance/validator-ejector/commit/791425002f9c7743a0f70816f7535d50a672647c))
* jest & logger tests ([5aed4af](https://github.com/lidofinance/validator-ejector/commit/5aed4af13666d7bd56366c00f48d09b8e6a6cb3b))
* job ([30ca605](https://github.com/lidofinance/validator-ejector/commit/30ca605a40541a868ae2e262e3861b219dea25ad))
* job metrics ([ded0fba](https://github.com/lidofinance/validator-ejector/commit/ded0fba1e7f50a10159a7bdb98bbe7d6ec0f801b))
* job runner module and refactoring ([1bd03ee](https://github.com/lidofinance/validator-ejector/commit/1bd03eec0a4b49abb0ae34cac5121850186528d1))
* json file format validation ([a4deb9d](https://github.com/lidofinance/validator-ejector/commit/a4deb9d4c307b6e2a54dfc2d4bb3b1c69ce84af3))
* jsonrpc provider metrics & logs ([9701ccf](https://github.com/lidofinance/validator-ejector/commit/9701ccf4086105257ad4df46f51602472fae53d7))
* lib -> services ([16680f2](https://github.com/lidofinance/validator-ejector/commit/16680f295614b7af9f24f9d460aa3feecffe73d0))
* locator integration ([9eb5b6e](https://github.com/lidofinance/validator-ejector/commit/9eb5b6e531ffde089a5b7fbd838a6fef773a6635))
* log progress on time-consuming tasks ([bb9d961](https://github.com/lidofinance/validator-ejector/commit/bb9d96103edfb4f8a3f2d2f777e4d728874501b5))
* log version on start ([dbcdf99](https://github.com/lidofinance/validator-ejector/commit/dbcdf99e54116ccc8924deec9e7b2e5c20f42811))
* logger ([b9debe5](https://github.com/lidofinance/validator-ejector/commit/b9debe58e47be9486586172cb95bb02a0fb6ea93))
* logger config ([be7c608](https://github.com/lidofinance/validator-ejector/commit/be7c608c4cfbc5ac61fa8d2cebb5dfe8ec7b35c4))
* logger level tests ([1268349](https://github.com/lidofinance/validator-ejector/commit/1268349f2c5559571deae9731509ef0b79e3fc50))
* logger print impr & json rpc debug log ([4fb0e09](https://github.com/lidofinance/validator-ejector/commit/4fb0e09d0394b13d9bb925ff9378a41969382b78))
* logger secrets ([cf94c24](https://github.com/lidofinance/validator-ejector/commit/cf94c248ff87f47bf0fcd9b4b8d5d1d8a04c7749))
* message loader ([74e13a7](https://github.com/lidofinance/validator-ejector/commit/74e13a7b9f33ceb1075a36c10b60a4f4eca99cc6))
* messages encryption ([9f687fd](https://github.com/lidofinance/validator-ejector/commit/9f687fd06e58697aba07cdd77c362976a5d02cd9))
* metrics ([ae00643](https://github.com/lidofinance/validator-ejector/commit/ae006433a9e9432b3a948d89884bca0c0b357dbd))
* metrics as service ([84aa046](https://github.com/lidofinance/validator-ejector/commit/84aa046f08631028a65cc599dfd2d49628bbccf0))
* minimize logger functional and fix todo in validator ([a93cdfd](https://github.com/lidofinance/validator-ejector/commit/a93cdfd880d1db2210e17c014d697cd31b378bd3))
* nanolib & consensus refactoring ([772a66d](https://github.com/lidofinance/validator-ejector/commit/772a66dee98fa0b5048be5ba41b6698733c3f668))
* new exit bus abi ([733200a](https://github.com/lidofinance/validator-ejector/commit/733200a17889c36f2d6fa04edfbfd3341729c6ee))
* new job runner ([d6056b7](https://github.com/lidofinance/validator-ejector/commit/d6056b7c38d5cbcd408d77aa7d9b27a8b679f99e))
* node sync checks ([695a7f9](https://github.com/lidofinance/validator-ejector/commit/695a7f9f8643d3cce2c69e573e0b72ae59e36981))
* optimize validator and logger communication ([10ce546](https://github.com/lidofinance/validator-ejector/commit/10ce54686fec089861df2d879f95f79ce9d72ef9))
* pretty print ([7555a50](https://github.com/lidofinance/validator-ejector/commit/7555a50cfab1d3a0070cdf57f930563a614c2b54))
* progress of exit events handling ([18fa3b4](https://github.com/lidofinance/validator-ejector/commit/18fa3b4c2983dfcc01dd2189d2637866f8bea35a))
* prom to request module & separate logger for validator ([bcbec9f](https://github.com/lidofinance/validator-ejector/commit/bcbec9f007f6516cb91ceade992f3ecb01559f6c))
* remote & local messages services and refactoring ([265c8b8](https://github.com/lidofinance/validator-ejector/commit/265c8b82ffd3d28a098c97163ddb7340fa980855))
* remove nanomodules from lib folder ([9fef289](https://github.com/lidofinance/validator-ejector/commit/9fef2899d6abda4469dfe5afc720b09aadbc2322))
* request module ([8dc77bb](https://github.com/lidofinance/validator-ejector/commit/8dc77bb5dd7d26bb478cfbe05b700599f4544d07))
* security ([09702fc](https://github.com/lidofinance/validator-ejector/commit/09702fcdd1d389c6ddf5c4ee2b39dde8b9c925f6))
* security metric on dashboard ([ec673d8](https://github.com/lidofinance/validator-ejector/commit/ec673d8448e71c5acfea097c682df60aa04c8e24))
* set metrics to 0 on start when possible ([f0768c5](https://github.com/lidofinance/validator-ejector/commit/f0768c56b9ce7c4a2842bccbc0c7dc679bacd083))
* signature validation ([436eaf0](https://github.com/lidofinance/validator-ejector/commit/436eaf0f6cf7adc08740e14c75ab69b5dd560bd8))
* staking module id config ([85051df](https://github.com/lidofinance/validator-ejector/commit/85051dfc1a0a65f8d46083996289b9f3c82f6a73))
* validator ([9705877](https://github.com/lidofinance/validator-ejector/commit/970587732c4b32049a1f793af509f0f9d6f589ea))
* webhook processing ([39bf947](https://github.com/lidofinance/validator-ejector/commit/39bf947815f563571e7b506d62edc85a40a4ae71))
* wip validator ([850dafe](https://github.com/lidofinance/validator-ejector/commit/850dafeb37c80c9e396441e77aa777e9d9931e8b))




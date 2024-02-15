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





## Mallet

Mallet, the minimum wallet, is a command line utility for deploying smart contracts and interacting with the [Cardano IELE and KEVM testnets](https://testnet.iohkdev.io/) developed by IOHK. Mallet is written in Javascript and is based on the Node.js REPL, so it gives access to some handy functions as well as libraries such as Web3. Mallet can also be included as a library in your own JavaScript programs.

## Installing

Mallet requires Node.js version 10.4.0 or later. There are more detailed instructions for installing Node.js and Mallet in two places.

First, there are pages on [installing Node.js and Mallet](https://testnet.iohkdev.io/iele/) along with a tutorial.

Second, there is a video, [Getting Started with Mallet](https://www.youtube.com/watch?v=Tp4Z0RbjSa8). 

Once you have Node.js installed, clone the [Mallet repository](https://github.com/input-output-hk/mallet) and install it with npm. Then, from the main directory run:

```
$ npm install
```

This will download and install all the dependencies.

## Running the command line interface

Type the following to see Mallet's help file:

```
$ ./mallet --help
```

Running Mallet with proper arguments will open a Node.js REPL session with the Mallet commands available. 

```
./mallet iele
```

Everything has to be valid JavaScript:

```
mallet> 1 + 1
2
mallet> const x = _
undefined
mallet> x
2
mallet> x = 3
TypeError: Assignment to constant variable.
mallet> help
[Function: help]
mallet> help()
undefined
```

## Caveats

* Mallet is a command line tool to be run on Node.js. Although it may be possible to import Mallet into a browser, this has not been tested and is not officially supported.
* Mallet takes advantage of `BigInt` arbitrary-precision integers, which were added to the [V8 Javascript engine in May 2018](https://v8project.blogspot.com/2018/05/bigint.html).
* To meet the requirements of an interactive shell environment, all Mallet's functions are synchronous.
* Because of an issue with the embeddable Node.js REPL, an augmented version of [rlp.js](https://github.com/ethereumjs/rlp) has been put in the `lib` folder


## Mallet commands

Technically speaking, the ‘commands’ discussed here are actually functions and properties of a Mallet object. We refer to them as commands because that reflects how Mallet is used.

### Getting help

When running Mallet, these commands may be useful.

#### `help`

Opens the README file you are reading in your default browser:

```
mallet> help()
undefined
```


#### `listCommands`

Lists the available commands: 

```
mallet> listCommands()
[ 'currentAccount',
  'getBalance',
  'getNonce',
  'getReceipt',
  'help',
  'iele.contractCall',
  'iele.createContract',
  'iele.simpleTransfer',
  'importPrivateKey',
  'lastTransaction',
  'listAccounts',
  'listCommands',
  'newAccount',
  'requestFunds',
  'selectAccount',
  'sendTransaction',
  'web3' ]
```


### Account management

These management commands operate on the local keystore and do not connect to a testnet.

#### `newAccount`

Creates a random key pair for a new managed account. The private key is stored in the datadir that is encrypted with the provided password. The command returns the corresponding account’s address.

```
mallet> newAccount()
Enter password:
Repeat password:
'0x8cc7c261b5dda47755ac9629ec32bba0ab4d1d32'
```


#### `importPrivateKey`

Imports a known private key as a managed account. The private key is stored in the datadir that is encrypted with the provided password. This import command returns the corresponding account’s address.

```
mallet> importPrivateKey()
Enter private key:
Enter password:
Repeat password:
'0xb0ff13c14e071b11ab678524ae28e6eb248de96a'
```

#### `listAccounts`

Lists the addresses of all managed accounts:

```
mallet> listAccounts()
[ '0xfc7e805d72ca57aff872cd010a4c9c5e8e8f22f2',
  '0xd7f3583b8805cfbe0979050f5a1b3587a8fee900',
  '0x724e5991252860ca530542719b25b39b1b437a1c',
  '0x60950641e7382a120c8825464391da3b84db2a86',
  '0xb0ff13c14e071b11ab678524ae28e6eb248de96a' ]
```

#### `selectAccount`

Selects an account for commands such as `sendTransaction`, `getBalance`, `requestFunds`:

```
mallet> selectAccount('0xfc7e805d72ca57aff872cd010a4c9c5e8e8f22f2')
'0xfc7e805d72ca57aff872cd010a4c9c5e8e8f22f2'
```

#### `currentAccount`

```
mallet> currentAccount()
'0xfc7e805d72ca57aff872cd010a4c9c5e8e8f22f2'
```

### Interacting with the testnet

The following commands interact with nodes on Mantis, the Ethereum client, via the JSON remote procedure call (RPC) protocol (using the Web3 library).

#### `getBalance`

Show the balance of an account:
```
mallet> currentAccount()
'0xfc7e805d72ca57aff872cd010a4c9c5e8e8f22f2'
mallet> getBalance()
'98474579999999000'
mallet> getBalance('0x60950641e7382a120c8825464391da3b84db2a86')
'1000'
```

#### `sendTransaction`

Sends a transaction signed with the selected account’s key and returns the transaction hash. This command requires a password to decrypt the private key.

```
mallet> tx = {
    to: '0x60950641e7382a120c8825464391da3b84db2a86', // recipient's address, optional, new contract created if not provided
    gas: 100000,                                      // gas limit, mandatory
    gasPrice: 5000000000,                             // gasPrice, optional, default: 5 Gwei
    value: 1000000,                                   // optional, default: 0
    data: '0xcafebabe'                                // optional, default: empty
}
mallet> sendTransaction(tx)
```

#### `getReceipt`

Obtains a receipt of a transaction with a given hash. If a hash is not provided, the hash of the most recent transaction will be used.

```
mallet> sendTransaction(tx)
Enter password:
'0xc71a634009c85640996d64124cf35c3748009c45c952ed456ff5c239ccd5b1d3'
mallet> getReceipt()
null
mallet> getReceipt()
{ transactionHash:
   '0xc71a634009c85640996d64124cf35c3748009c45c952ed456ff5c239ccd5b1d3',
  transactionIndex: 0,
  blockNumber: 295346,
  blockHash:
   '0x007643f3198296fe6e1b3f125ec603aa758d813cb9ae2c7a2a06daf5357d30bc',
  cumulativeGasUsed: 21272,
  gasUsed: 21272,
  contractAddress: null,
  logs: [],
  status: '0x00',
  returnData: '0x' }
```

```
mallet> getReceipt('0x00039c02c1ca8cb2b25226f74887fc0afcf485797de65afbc105dab13497ba57')
{ transactionHash:
   '0x00039c02c1ca8cb2b25226f74887fc0afcf485797de65afbc105dab13497ba57',
  transactionIndex: 0,
  blockNumber: 295367,
  blockHash:
   '0x7cc78c2593fefdac318893264cf8a05c792f8deb41dc8e35fc5b783fc45b4085',
  cumulativeGasUsed: 21272,
  gasUsed: 21272,
  contractAddress: null,
  logs: [],
  status: '0x00',
  returnData: '0x' }  
```

Note that the receipt may not be readily available, indicated with `null` value, because it takes time for a transaction to be forged.

#### `requestFunds`



This command is different, in that it doesn't interact with the JSON RPC. Instead, it calls the testnet [Faucet](https://testnet.iohkdev.io/iele/faucet/) to obtain funds for a given account. It returns the transaction hash.

```
mallet> currentAccount()
'0xfc7e805d72ca57aff872cd010a4c9c5e8e8f22f2'
mallet> getBalance()
'972415314998966999'
mallet> requestFunds()
'0x1fc10c0ae70b09fb89fbc39d827c301d05ed0f196f3c54f3c52c4e683b89ff27'
mallet> getBalance()
'1002415314998966999'
```

```
mallet> requestFunds('0xd7f3583b8805cfbe0979050f5a1b3587a8fee900')
'0x03c485c980faf11c89d74c92a8d26efda7860edbb7de4a689220e33180a82e6c'
mallet> requestFunds('0xd7f3583b8805cfbe0979050f5a1b3587a8fee900')
Thrown: Faucet error: The user has sent too many requests in a given amount of time.
```

### IELE commands

The following commands are variations of `sendTransaction`. They ensure that data is properly encoded for the IELE virtual machine. The argument transaction object is the same as in the case of `sendTransaction`, except for the `data` field.

#### `iele.simpleTransfer`

This transfers value between accounts Technically, this calls the `deposit` function of the IELE virtual machine on the recipient's account.

```
mallet> getBalance('0xd7f3583b8805cfbe0979050f5a1b3587a8fee900')
'0'
mallet> iele.simpleTransfer({to: '0xd7f3583b8805cfbe0979050f5a1b3587a8fee900', gas: 100000, value: 1000})
Enter password:
'0x1a0ef8a980851ade10f76bcb4b21cd2ad79e13d0b181419a7785ac620fbd2b82'
mallet> getBalance('0xd7f3583b8805cfbe0979050f5a1b3587a8fee900')
'1000'
```


#### `iele.createContract`

Creates a contract with the bytecode provided in the `code` field, with optional constructor arguments as `args` – an array of integers.

```
mallet> let code = '00000091630369000F696E6372656D656E745828696E742969000667657458282967000000006600003400650002006180016101025511660001F60000660002620101F7016800010001660000340165000201610102541301001C6101025514660001F60000660002620102F7026800020000660000340065000200610101540A6013640001660001F6000103660002620101F701'
undefined
mallet> iele.createContract({gas: 1000000, value: 0, code: code, args: []})
Enter password:
'0xb13e7783c86dda3f880b2d875201a1d4c4f7f0ae5b085e320dc32a7688ce394d'
mallet> getReceipt()
{ transactionHash:
   '0xb13e7783c86dda3f880b2d875201a1d4c4f7f0ae5b085e320dc32a7688ce394d',
  transactionIndex: 0,
  blockNumber: 36577,
  blockHash:
   '0x4d65719d5be6ce74ea02f8a59461bde8b831ae02ad72c127e9004b29a394f4c6',
  cumulativeGasUsed: 60730,
  gasUsed: 60730,
  contractAddress: '0x79c7f680aa944545744f611a1a9770426903cee9',
  logs: [],
  status: '0x00',
  returnData: '0xd59479c7f680aa944545744f611a1a9770426903cee9' }
```

#### `iele.contractCall`

Calls function `func` of a contract at the `to` address.  As with the previous command, there are optional arguments, `args`, as an array of integers.

```
mallet> iele.contractCall({to: '0x79c7f680aa944545744f611a1a9770426903cee9', gas: 1000000, func: 'getX()', args: []})
Enter password:
'0x767f44039fbb67503a18688c38576fe0396dc55e18d057b7bef86d9a62fffb57'
mallet> getReceipt()
{ transactionHash:
   '0x767f44039fbb67503a18688c38576fe0396dc55e18d057b7bef86d9a62fffb57',
  transactionIndex: 0,
  blockNumber: 36663,
  blockHash:
   '0x20d1063fad4453e15f74962ba8d9bc009b4827ca3df6b7dd130a8723f8bb6ebf',
  cumulativeGasUsed: 21838,
  gasUsed: 21838,
  contractAddress: null,
  logs: [],
  status: '0x00',
  returnData: '0xc100' }
```

```
mallet> iele.contractCall({to: '0x79c7f680aa944545744f611a1a9770426903cee9', gas: 1000000, func: 'incrementX(int)', args: [13]})
Enter password:
'0x9592150326c811ad71e55a007b589763c6dbd6365eae2cb66f6532ca780b0799'
mallet> getReceipt()
null
mallet> getReceipt()
{ transactionHash:
   '0x9592150326c811ad71e55a007b589763c6dbd6365eae2cb66f6532ca780b0799',
  transactionIndex: 0,
  blockNumber: 36670,
  blockHash:
   '0x7daf8a59044c66a1d320043287837b3d1f7d78e2b462e8dc218487cae6d80349',
  cumulativeGasUsed: 28263,
  gasUsed: 28263,
  contractAddress: null,
  logs: [],
  status: '0x00',
  returnData: '0xc0' }
```


### Compiling contracts

Compiling contracts is currently only supported for IELE, and only for a single source file. Both IELE assembly language and Solidity (using a Solidity-to-IELE compiler) contracts can be compiled. Both compilers are services of the testnet that Mallet connects to (there are no additional dependencies).

#### `iele.compile`

Sends the source code from the provided file path to the compiler. The mode of compilation is determined by the extension of the source file:
* `.sol`:  two-step compilation: Solidity to IELE and then to IELE assembly
* `.iele`: direct to IELE assembly

```
mallet> iele.compile('test/contracts/sendEther.sol')
{ source:   '// Simple contract ...'
  solidityCompilerOutput: 'Warning: This is a pre-release compiler version...',
  error: false,
  ieleCode: 'contract "main.sol:test" ...',
  bytecode: '000000AA630469000F612...' }
```

The compiled contract is available in the `bytecode` property, which can then be used as an argument to `iele.createContract`. In the case of a compilation failure, the `error` property will be set to `true` and the relevant compiler output can be found in `solidityCompilerOutput`.

With direct IELE assembly compilation, the compiler interface is simpler:

```
mallet> iele.compile('test/contracts/sendEther.iele')
{ source: 'contract "sendEther" {\n\ndefine @init() ...',
  result: '000000AA630469000...' }
```

The `result` property will contain either the correctly compiled bytecode, or textual error information.


## Importing as library

See [basic-kevm.js](test/basic-kevm.js) for an example of using Mallet in script. 

Mallet is not currently published to the NPM repository, but it can still be installed in your Node.js project, by pointing `npm` to the cloned git repository folder:

```
$ npm install path/to/mallet
```

## Need more help?

As mentioned before, the IELE testnet pages have detailed instructions and a rather good video:

* Installing Node.js and Mallet, plus a tutorial from: https://testnet.iohkdev.io/iele/

* Getting Started with Mallet video: https://www.youtube.com/watch?v=Tp4Z0RbjSa8

* The Mallet repository is here: https://github.com/input-output-hk/mallet

* IOHK provides support on using IELE and the testnet. Details at: https://testnet.iohkdev.io/iele/resources/support-and-help/

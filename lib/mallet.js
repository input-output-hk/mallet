const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx')
const keythereum = require('keythereum');
const readlineSync = require('readline-sync');
const os = require('os');
const path = require('path');
const fs = require('fs');
const autoBind = require('auto-bind');
const url = require('url');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const rlp = require('../lib/rlp.js');


function thr0w(e) {
  throw e;
}

function readSecret(prompt) {
  const input = readlineSync.question(prompt, {
    hideEchoBack: true,
    mask: ' '
  });
  process.stdin.resume();
  process.stdin.setRawMode(true)
  return input;
}

function readPasswordOnce() {
  return readSecret('Enter password: ');
}

function readPasswordTwice() {
  const pass1 = readSecret('Enter password: ');
  const pass2 = readSecret('Repeat password: ');

  if (pass1 === pass2) {
    return pass1;
  } else {
    throw 'Passwords did not match';
  }
}

function encodeNumber(number) {
  const bi = BigInt(number);

  const dim = function(n, l = 0n, r = 0n) {
    if (n < 128n || n == 128n && r == 0n)
      return l;
    else {
      return dim(n >> 8n, l + 1n, n & 255n);
    }
  }

  const complement = bi >= 0 ? bi : (256n << (8n * dim(-bi))) + bi;

  const reprStr = complement.toString(16);
  const paddedStr = reprStr.length % 2 ? '0' + reprStr : reprStr;
  const buf = Buffer.from(paddedStr, 'hex');
  const signedBuf = buf[0] > 127 && bi > 0 ? Buffer.concat([Buffer.from([0]), buf]) : buf;
  return signedBuf;
}

const testnets = {
  kevm: {
    rpc: 'https://kevm-testnet.iohkdev.io:8546',
    faucet: 'https://kevm-testnet.iohkdev.io:8099/faucet'
  },

  iele: {
    rpc: 'https://iele-testnet.iohkdev.io:8546',
    faucet: 'https://iele-testnet.iohkdev.io:8099/faucet',
    compiler: 'https://remix-testnet.iele.mantis.iohkdev.io/remix/api'
  }
}

function getUrls(base) {
  const testnet = testnets[base]
  if (testnet !== undefined) {
    return testnet;
  } else {
    const custom = url.parse(base)
    custom.port = 8099;
    custom.host = null;
    const faucet = url.resolve(url.format(custom), '/faucet');
    return {rpc: base, faucet};
  }
}

class Iele {
  constructor(mallet) {
    this.mallet = mallet;
  }

  simpleTransfer(tx, password) {
    if (!tx.to)
      throw "'to' property must be defined (target address)"

    tx.data = `0xc9876465706f736974c0` // RLP-encoded 'deposit' function with no args
    return this.mallet.sendTransaction(tx, password)
  }

  contractCall(tx, password) {
    if (!tx.to)
      throw "'to' property must be defined (target address)"

    const func = tx.func !== undefined ? tx.func : thr0w("'func' property must be defined (contract function to be called)");
    const args = (tx.args || []).map(n => encodeNumber(n));

    tx.data = '0x' + rlp.encode([func, args]).toString('hex');
    return this.mallet.sendTransaction(tx, password);
  }

  createContract(tx, password) {
    if (tx.code === undefined)
      throw("'code' property must be defined (new contract's code)");

    const code =
      tx.code instanceof Buffer
        ? tx.code
      : tx.code.startsWith('0x')
        ? Buffer.from(tx.code.substring(2), 'hex')
        : Buffer.from(tx.code, 'hex')
    const args = (tx.args || []).map(n => encodeNumber(n));

    tx.data = '0x' + rlp.encode([code, args]).toString('hex');
    return this.mallet.sendTransaction(tx, password);
  }

  _makeCompilerRequest(source, compiler) {
    const request = new XMLHttpRequest();
    request.open('POST', testnets.iele.compiler, false);
    request.setRequestHeader("Content-Type", "application/json");
    request.responseType = 'json';

    const payload = {
      "jsonrpc": "2.0", 
      "method": compiler == 'solidity' ? "sol2iele_asm" : "iele_asm",
      "id": 0,
      "params": [
        "main.sol", 
        {
          "main.sol": source
        }
      ]
    }
    request.send(JSON.stringify(payload));

    if (request.status == 200) {
      let responseJson = null;
      try {
        responseJson = JSON.parse(request.responseText);
      } catch (err) {
        throw 'Compiler error: ' + err;
      }

      if (responseJson.error) {
        throw 'Compiler error: ' + JSON.stringify(responseJson.error);
      } else {
        return responseJson.result;
      }
    } else {
      throw 'Compiler error: ' + request.status + '\n' + request.responseText;
    }
  }

  _compileSol(source) {
    const output = this._makeCompilerRequest(source, 'solidity')

    let codeStarted = false;
    let code = '';

    for (let line of output.split('\n')) {
      if (codeStarted) {
        code += line + '\n'
      } else {
        codeStarted = line === 'IELE assembly:'
      }
    }

    const result = {source: source, solidityCompilerOutput: output, error: false}

    if (codeStarted) {
      result.ieleCode = code;
      const bytecode = this._compileIele(code).result;
      result.bytecode = bytecode;
      return result;
    } else {
      result.error = true;
      return result;
    }
  }

  _compileIele(source) {
    const result = this._makeCompilerRequest(source, 'iele');
    return {source: source, result: result};
  }

  compile(path) {
    const contents = fs.readFileSync(path).toString('utf-8');
    if (path.endsWith('.iele')) {
      return this._compileIele(contents);
    } else if (path.endsWith('.sol')) {
      return this._compileSol(contents);
    } else {
      throw 'filename suffix must be .sol or .iele';
    }
  }
}

class Mallet {

  constructor(url, datadir) {
    const {rpc, faucet} = getUrls(url);
    this.web3 = new Web3(new Web3.providers.HttpProvider(rpc));
    this.faucetUrl = faucet

    this.datadir = datadir;
    this.keystore = path.join(this.datadir, 'keystore');

    this.selectedAccount = null;
    this.lastTx = null;

    this.iele = new Iele(this);
    
    if (!fs.existsSync(this.datadir)){
      fs.mkdirSync(this.datadir);
    }

    if (!fs.existsSync(this.keystore)){
      fs.mkdirSync(this.keystore);
    }

    autoBind(this);
  }

  getBalance(addr) {
    return this.web3.eth.getBalance(this.resolveAddress(addr)).toString();
  }

  newAccount(pass) {
    const password = pass !== undefined ? pass : readPasswordTwice();
    const dk = keythereum.create();
    const keyObject = keythereum.dump(password, dk.privateKey, dk.salt, dk.iv);
    keythereum.exportToFile(keyObject, this.keystore);
    return keythereum.privateKeyToAddress(dk.privateKey);
  }

  listAccounts() {
    const files = fs.readdirSync(this.keystore);
    const pattern = /^UTC--.*--([0-9a-fA-F]{40})$/;
    const accounts = files.filter(f => f.match(pattern)).map(f => '0x' + f.replace(pattern, '$1'));
    return accounts;
  }

  importPrivateKey(keyHex, pass) {
    const input = keyHex !== undefined ? keyHex : readSecret('Enter private key: ');
    const prvKeyHex = input.startsWith('0x') ? input.substring(2) : input;

    
    if (!keythereum.isHex(prvKeyHex) && !keythereum.isBase64(prvKeyHex)) {
      throw 'Invalid key format';
    } else {
      const password = pass !== undefined ? pass : readPasswordTwice();
      
      const randomBytes = keythereum.crypto.randomBytes(keythereum.constants.ivBytes + keythereum.constants.keyBytes);
      const privateKey = keythereum.str2buf(prvKeyHex);
      const iv = randomBytes.slice(0, keythereum.constants.ivBytes);
      const salt = randomBytes.slice(keythereum.constants.ivBytes);
      
      const keyObject = keythereum.dump(password, privateKey, salt, iv);
      keythereum.exportToFile(keyObject, this.keystore);
      return keythereum.privateKeyToAddress(privateKey);
    }
  }

  selectAccount(addr) {
    if (!this.listAccounts().includes(addr)) {
      throw `No account with address ${addr} in keystore`;
    } else {
      this.selectedAccount = addr;
      return addr;
    }
  }

  currentAccount() {
    return this.selectedAccount;
  }

  getNonce(addr) {
    return this.web3.eth.getTransactionCount(this.resolveAddress(addr));
  }

  sendTransaction(tx, password) {
    const from = this.resolveAddress(null);
    const privateKey = this.recoverPrivateKey(from, password);

    tx.gasPrice = tx.gasPrice || 5000000000;
    tx.gasLimit = tx.gasLimit || tx.gas || thr0w('gas must be explicitly provided');
    //Set default chainId if EIP-155 is used
    //tx.chainId = tx.chainId === undefined ? 61 : tx.chainId;
    tx.nonce = tx.nonce === undefined ? this.getNonce(from) : tx.nonce;

    const ethTx = new EthereumTx(tx);
    ethTx.sign(privateKey);
    const serializedTx = ethTx.serialize();

    const hash = this.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    this.lastTx = tx;
    this.lastTx.from = from;
    this.lastTx.hash = hash;
    return hash;
  }

  lastTransaction() {
    return this.lastTx;
  }

  getReceipt(hash) {
    const resolvedHash = hash || this.lastTx.hash || thr0w('No TX recorded');
    return this.web3.eth.getTransactionReceipt(resolvedHash);
  }

  resolveAddress(addr) {
    return addr || this.selectedAccount || thr0w('No account selected');
  }

  recoverPrivateKey(addr, pass) {
    const keyObject = keythereum.importFromFile(addr, this.datadir);
    const password = pass !== undefined ? pass : readPasswordOnce();
    const key = keythereum.recover(password, keyObject);
    return key.slice(Math.max(0, key.length - keythereum.constants.keyBytes));
  }

  requestFunds(addr)  {
    const address = this.resolveAddress(addr);
    const queryUrl = this.faucetUrl + '?address=' + address;

    const request = new XMLHttpRequest();
    request.open('POST', queryUrl, false);
    request.send('');

    if (request.status == 200) {
      return request.responseText;
    } else {
      throw "Faucet error: " + request.responseText;
    }
  }
}

module.exports = Mallet;

const Web3 = require('./web3/web3');
const EthereumTx = require('ethereumjs-tx')
const keythereum = require('keythereum');
const readlineSync = require('readline-sync');
const os = require('os');
const path = require('path');
const fs = require('fs');
const autoBind = require('auto-bind');
const url = require('url');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const rlp = require('./rlp');
const ieleTranslator = require('./ieleTranslator');
const typeChk = require('./typeChk');
const IeleCompiler = require('./ieleCompiler');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

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

  // how many bytes required to store the number (without sign)
  const dim = function(n, l = 1n, r = 0n) {
    if (n < 128n || n == 128n && r == 0n)
      return l;
    else {
      return dim(n >> 8n, l + 1n, n & 255n);
    }
  }

  const complement = bi >= 0 ? bi : (1n << (8n * dim(-bi))) + bi;

  const reprStr = complement.toString(16);
  const paddedStr = reprStr.length % 2 ? '0' + reprStr : reprStr;
  const buf = Buffer.from(paddedStr, 'hex');
  const signedBuf = buf[0] > 127 && bi > 0 ? Buffer.concat([Buffer.from([0]), buf]) : buf;
  return signedBuf;
}

function decodeNumber(buffer) {
  if (buffer.length == 0) 
    throw('decodeNumber: empty buffer');
  else {
    const makePositive = function(buf, pos = 0n) {
      if (buf.length == 0)
        return pos;
      else {
        const p = (pos << 8n) + BigInt(buf[0]);
        return makePositive(buf.slice(1), p);
      }
    }

    const isPositive = buffer[0] < 128;
    const positive = makePositive(buffer);

    if (isPositive)
      return positive;
    else {
      const dim = 1n << BigInt(buffer.length * 8);
      return positive - dim;
    }
  }
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

function createRequestLogger(logdir) {
  const {combine, timestamp, label, prettyPrint} = winston.format;
  const format = combine(label({ label: 'JSON-RPC' }), timestamp(), prettyPrint());
  return winston.createLogger({
    format: format,
    transports: [
      new DailyRotateFile({
        filename: path.join(logdir, 'requests_%DATE%.log')
      })
    ]
  });
}

class Iele {
  constructor(mallet) {
    this._mallet = mallet;
    this._compiler = new IeleCompiler(testnets.iele.compiler);
  }

  simpleTransfer(tx, password) {
    if (!tx.to)
      throw "'to' property must be defined (target address)"

    tx.data = `0xc9876465706f736974c0` // RLP-encoded 'deposit' function with no args
    return this._mallet.sendTransaction(tx, password)
  }

  callContract(tx, password) {
    if (!tx.to)
      throw "'to' property must be defined (target address)"

    const func = tx.func !== undefined ? tx.func : thr0w("'func' property must be defined (contract function to be called)");
    const args = (tx.args || []).map(n => encodeNumber(n));

    tx.data = '0x' + rlp.encode([func, args]).toString('hex');
    return this._mallet.sendTransaction(tx, password);
  }

  constantCall(tx) {
    if (!tx.to)
      throw "'to' property must be defined (target address)"

    const func = tx.func !== undefined ? tx.func : thr0w("'func' property must be defined (contract function to be called)");
    const args = (tx.args || []).map(n => encodeNumber(n));
    tx.data = '0x' + rlp.encode([func, args]).toString('hex');
    tx.func = undefined; // no idea why this is needed
    tx.args = undefined;

    const returnData = this._mallet.web3.eth.call(tx);
    return rlp.decode(returnData).map(b => decodeNumber(b));
  }

  deployContract(tx, password) {
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
    return this._mallet.sendTransaction(tx, password);
  }

  enc(value, type) {
    return BigInt(ieleTranslator.encode(value, {type: type}));
  }

  dec(value, type) {
    const s = value.toString(16);
    const v = s.length % 2 == 0 ? s : '0' + s;
    const r = ieleTranslator.decode(v, {type: type});
    if (r.rest.length > 0)
      throw 'Unexpected conversion remainder: ' + JSON.stringify(r);
    else
      return r.result;
  }

  compile(mainSourcePath) {
    return this._compiler.compile(mainSourcePath);
  }
}

class Mallet {

  constructor(url, datadir) {
    this.datadir = datadir;
    this.keystore = path.join(this.datadir, 'keystore');
    this.logdir = path.join(this.datadir, 'logs');

    [this.datadir, this.logdir, this.keystore].forEach(d => {
      if (!fs.existsSync(d)) 
        fs.mkdirSync(d); 
    });

    const {rpc, faucet} = getUrls(url);

    this.web3 = new Web3(new Web3.providers.HttpProvider(rpc), createRequestLogger(this.logdir));
    this.faucetUrl = faucet;

    this.selectedAccount = null;
    this.lastTx = null;

    this.iele = new Iele(this);    

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
    const receipt = this.web3.eth.getTransactionReceipt(resolvedHash);
    if (receipt && receipt.statusCode !== undefined) {
      try {
        const rawReturnData = receipt.returnData;
        receipt.returnData = rlp.decode(rawReturnData).map(b => decodeNumber(b));
        receipt.rawReturnData = rawReturnData;
      } catch (e) {}
    }
    return receipt;
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

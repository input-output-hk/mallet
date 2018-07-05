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


const testnets = {
  kevm: {
    rpc: 'https://kevm-testnet.iohkdev.io:8546',
    faucet: 'https://kevm-testnet.iohkdev.io:8099/faucet'
  },

  iele: {
    rpc: 'https://staging.iele-private.mantis.iohkdev.io:8546',
    faucet: 'https://staging.iele-private.mantis.iohkdev.io:8099/faucet'
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

class Mallet {

  constructor(url, datadir) {
    const {rpc, faucet} = getUrls(url);
    this.web3 = new Web3(new Web3.providers.HttpProvider(rpc));
    this.faucetUrl = faucet

    this.datadir = datadir;
    this.keystore = path.join(this.datadir, 'keystore');

    this.selectedAccount = null;
    this.lastTx = null;
    
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

    
    if (!keythereum.isHex(input) && !keythereum.isBase64(input)) {
      throw 'Invalid key format';
    } else {
      const password = pass !== undefined ? pass : readPasswordTwice();
      
      const randomBytes = keythereum.crypto.randomBytes(keythereum.constants.ivBytes + keythereum.constants.keyBytes);
      const privateKey = keythereum.str2buf(input);
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

  // "c9876465706f736974c0" # RLP-encoded "deposit" method call with no arguments
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

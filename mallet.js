const Repl = require('repl');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx')
const keythereum = require('keythereum');
const readlineSync = require('readline-sync');
const os = require('os');
const path = require('path');
const fs = require('fs');
const ReplHistory = require('repl.history');

const datadir = path.join(os.homedir(), '.mallet-js');
const keystore = path.join(datadir, 'keystore');

selectedAccount = null;

web3 = new Web3(new Web3.providers.HttpProvider('https://kevm-testnet.iohkdev.io:8546'))


getBalance = function (addr) {
  return web3.eth.getBalance(resolveAddress(addr)).toString();
}

newAccount = function () {
  const password = readPasswordTwice();
  const dk = keythereum.create();
  const keyObject = keythereum.dump(password, dk.privateKey, dk.salt, dk.iv);
  keythereum.exportToFile(keyObject, keystore);
  return keythereum.privateKeyToAddress(dk.privateKey);
}

listAccounts = function() {
  const files = fs.readdirSync(keystore);
  const pattern = /^UTC--.*--([0-9a-fA-F]{40})$/;
  const accounts = files.filter(f => f.match(pattern)).map(f => '0x' + f.replace(pattern, '$1'));
  return accounts;
}

importPrivateKey = function() {
  const input = readSecret('Enter private key: ');
  
  if (!keythereum.isHex(input) && !keythereum.isBase64(input)) {
    throw 'Invalid key format';
  } else {
    const password = readPasswordTwice();
    
    const randomBytes = keythereum.crypto.randomBytes(keythereum.constants.ivBytes + keythereum.constants.keyBytes);
    const privateKey = keythereum.str2buf(input);
    const iv = randomBytes.slice(0, keythereum.constants.ivBytes);
    const salt = randomBytes.slice(keythereum.constants.ivBytes);
    
    const keyObject = keythereum.dump(password, privateKey, salt, iv);
    keythereum.exportToFile(keyObject, keystore);
    return keythereum.privateKeyToAddress(privateKey);
  }
}

selectAccount = function(addr) {
  if (!listAccounts().includes(addr)) {
    throw `No account with address ${addr} in keystore`;
  } else {
    selectedAccount = addr;
    return addr;
  }
}

getNonce = function(addr) {
  return web3.eth.getTransactionCount(resolveAddress(addr));
}

sendTransaction = function(tx) {
  const from = resolveAddress(null);
  const privateKey = recoverPrivateKey(from);

  tx.gasPrice = tx.gasPrice || 5000000000;
  tx.gasLimit = tx.gasLimit || tx.gas || thr0w('gas must be explicitly provided');
  tx.chainId = tx.chainId || 61;
  tx.nonce = tx.nonce || getNonce(from);

  const ethTx = new EthereumTx(tx);
  ethTx.sign(privateKey);
  const serializedTx = ethTx.serialize();

  return web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
}

getReceipt = function(hash) {
  return web3.eth.getTransactionReceipt(hash);
}

function resolveAddress(addr) {
  return addr || selectedAccount || thr0w('No account selected');
}

function recoverPrivateKey(addr) {
  const keyObject = keythereum.importFromFile(addr, datadir);
  const password = readPasswordOnce();
  const key = keythereum.recover(password, keyObject);
  return key.slice(Math.max(0, key.length - keythereum.constants.keyBytes));
}

rpk = recoverPrivateKey

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

function thr0w(e) {
  throw e;
}

function start() {
  if (!fs.existsSync(keystore)){
    fs.mkdirSync(keystore);
  }
  
  const repl = Repl.start('mallet> ');
  ReplHistory(repl, path.join(datadir, '.history'));
}

start()


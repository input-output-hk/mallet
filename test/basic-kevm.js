const Mallet = require('../lib/mallet.js');
const fs = require('fs-extra');
const assert = require('assert');
const sleep = require('sleep');


const datadir = '/tmp/basic-kevm-test';
fs.removeSync(datadir);
const mallet = new Mallet('kevm', '/tmp/basic-kevm-test');

function awaitReceipt(hash) {
  let rec = mallet.getReceipt(hash);
  if (rec) {
  	return rec;
  } else {
  	console.log("awaiting receipt for " + hash);
  	sleep.sleep(5);
  	return awaitReceipt(hash);
  }
}

const prvKeyA = '8da9957c05b4c29889d29c511b0d4a7a055f9332d9e6186f6e01cd8941339db7'
const accA = '0xb0ff13c14e071b11ab678524ae28e6eb248de96a'


// import key
let res = mallet.importPrivateKey(prvKeyA, 'passw0rd');
assert.strictEqual(res, accA);

// new key
const accB = mallet.newAccount('passw0rd');
res = mallet.listAccounts().filter(a => a != accA)[0]
assert.strictEqual(res, accB);
res = mallet.getBalance(accB);
assert.strictEqual(res, '0');

// selecting account
mallet.selectAccount(accA);
res = mallet.currentAccount();
assert.strictEqual(res, accA);

// requesting funds
const balA1 = mallet.getBalance();
res = mallet.requestFunds();
awaitReceipt(res);
const balA2 = mallet.getBalance();
console.log(balA1, '<', balA2);
assert.ok(parseInt(balA2) > parseInt(balA1));

// sending TX
let tx = {to: accB, gas: 100000, value: 1000}
res = mallet.sendTransaction(tx, 'passw0rd');
awaitReceipt(res);
assert.strictEqual(mallet.getBalance(accB), '1000')

console.log('SUCCESS!');


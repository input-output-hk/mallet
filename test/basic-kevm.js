const test = require('./testHelper')('kevm');
const assert = require('assert');

const mallet = test.mallet

// import key
let res = mallet.importPrivateKey(test.prvKeyA, 'passw0rd');
assert.strictEqual(res, test.accA);

// new key
const accB = mallet.newAccount('passw0rd');
res = mallet.listAccounts().filter(a => a != test.accA)[0]
assert.strictEqual(res, accB);
res = mallet.getBalance(accB);
assert.strictEqual(res, '0');

// selecting account
mallet.selectAccount(test.accA);
res = mallet.currentAccount();
assert.strictEqual(res, test.accA);

// requesting funds
const balA1 = mallet.getBalance();
res = mallet.requestFunds();
test.awaitReceipt(res);
const balA2 = mallet.getBalance();
console.log(balA1, '<', balA2);
assert.ok(parseInt(balA2) > parseInt(balA1));

// sending TX
let tx = {to: accB, gas: 100000, value: 1000}
res = mallet.sendTransaction(tx, 'passw0rd');
test.awaitReceipt(res);
assert.strictEqual(mallet.getBalance(accB), '1000')

console.log('SUCCESS!');


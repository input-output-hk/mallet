const test = require('./testHelper')('iele');
const assert = require('assert');

const mallet = test.mallet;

mallet.importPrivateKey(test.prvKeyA, '');
mallet.selectAccount(test.accA);

mallet.requestFunds();

const contract = mallet.iele.compile('contracts/types.sol');
mallet.iele.deployContract({gas: 1000000, code: contract.bytecode}, '');
const creationReceipt = test.awaitReceipt();

const fName = 'f(int[],string,bytes,bytes4,address)';
const args = [[1, 2, 3], 'hello world', '0x1122334455667788', '0xcafebabe', test.accA];
const types = ['int[]', 'string', 'bytes', 'bytes4', 'address'];
const encodedArgs = args.map((v, i) => mallet.iele.enc(v, types[i]));

mallet.iele.callContract({to: creationReceipt.contractAddress, gas: 1000000, func: fName, args: encodedArgs}, '');
const callReceipt = test.awaitReceipt();

const decodedArgs = callReceipt.returnData.map((v, i) => mallet.iele.dec(v, types[i]));
console.log(decodedArgs);
assert.deepEqual(args, decodedArgs);





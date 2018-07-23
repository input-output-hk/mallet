const Mallet = require('../lib/mallet.js');
const fs = require('fs-extra');
const sleep = require('sleep');


const datadir = '/tmp/mallet-test-datadir';
fs.removeSync(datadir);

const prvKeyA = '8da9957c05b4c29889d29c511b0d4a7a055f9332d9e6186f6e01cd8941339db7'
const accA = '0xb0ff13c14e071b11ab678524ae28e6eb248de96a'

function init(testnet) {

  const mallet = new Mallet(testnet, datadir);

  function awaitReceipt(hash) {
    let h = hash || mallet.lastTransaction().hash;
    let rec = mallet.getReceipt(h);
    if (rec) {
      return rec;
    } else {
      console.log("awaiting receipt for " + h);
      sleep.sleep(5);
      return awaitReceipt(h);
    }
  }

  return {
    mallet,
    awaitReceipt,
    prvKeyA,
    accA
  }
}

module.exports = init
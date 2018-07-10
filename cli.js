const Mallet = require('./lib/mallet.js');
const path = require('path');
const os = require('os');
const Repl = require('repl');
const ReplHistory = require('repl.history');
const program = require('commander');


function parseArgs() {
  program
    .option('-d, --datadir', 'Specify data directory')
    .parse(process.argv);
}

function start() {
  parseArgs();
  const datadir = program.datadir || path.join(os.homedir(), '.mallet2');

  const mallet = new Mallet(program.args[0], datadir);
  
  const repl = Repl.start('mallet> ');

  const exportedProperties = [
    'web3', 
    'listAccounts', 
    'newAccount',
    'importPrivateKey',
    'getBalance',
    'getNonce',
    'selectAccount',
    'currentAccount',
    'sendTransaction',
    'lastTransaction',
    'getReceipt',
    'requestFunds',
    'iele'
  ]
  repl.context.mallet = mallet;
  exportedProperties.forEach(prop => repl.context[prop] = mallet[prop]);

  ReplHistory(repl, path.join(datadir, '.history'));
}


start();

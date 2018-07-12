const Mallet = require('./lib/mallet.js');
const path = require('path');
const os = require('os');
const Repl = require('repl');
const ReplHistory = require('repl.history');
const prog = require('caporal');
const opn = require('opn');


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

function listCommands() {
  const ieleCommands = ['iele.simpleTransfer', 'iele.contractCall', 'iele.createContract'];
  const utils = ['help', 'listCommands'];
  return exportedProperties.filter(x => x !== 'iele').concat(ieleCommands).concat(utils).sort();
}

function help() {
  opn('https://github.com/input-output-hk/mallet/blob/master/README.md');
}

function start(args, opts) {
  const mallet = new Mallet(args.testnet, opts.datadir);
  
  const repl = Repl.start('mallet> ');

  repl.context.mallet = mallet;
  repl.context.listCommands = listCommands;
  repl.context.help = help;
  exportedProperties.forEach(prop => repl.context[prop] = mallet[prop]);

  ReplHistory(repl, path.join(opts.datadir, '.history'));
}


prog
  .bin('mallet')
  .description('command line utility for KEVM/IELE testnets')
  .version(require('./package.json').version)
  .argument('<testnet>', "JSON RPC endpoint to connect. Possible values are: 'kevm', 'iele', or a custom HTTP(S) URL")
  .option('-d, --datadir', 'Specify data directory', prog.STRING, path.join(os.homedir(), '.mallet2'))
  .action(function(args, opts, logger) {
    start(args, opts);
  });

prog.parse(process.argv);

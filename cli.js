#!/usr/bin/env node

const Mallet = require('./lib/mallet.js');
const path = require('path');
const os = require('os');
const Repl = require('repl');
const ReplHistory = require('repl.history');
const commander = require('commander');
const opn = require('opn');
const rlp = require('./lib/rlp.js');
const program = {
  name: 'mallet',
  version: require('./package.json').version,
  description: 'IELE/KEVM testnet utility'
}


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
  const ieleCommands = ['iele.simpleTransfer', 'iele.contractCall', 'iele.createContract, iele.compile'];
  const utils = ['help', 'listCommands', 'rlp'];
  return exportedProperties.filter(x => x !== 'iele').concat(ieleCommands).concat(utils).sort();
}

function help() {
  opn('https://github.com/input-output-hk/mallet/blob/master/README.md');
}

function start(datadir, testnet) {
  console.log(`${program.name} ${program.version} - ${program.description}\n` +
    `Type 'help()' to view the online documentation or 'listCommands()' to view available commands\n`);

  const mallet = new Mallet(testnet, datadir);
  
  const repl = Repl.start(program.name + '> ');

  repl.context.mallet = mallet;
  repl.context.listCommands = listCommands;
  repl.context.help = help;
  repl.context.rlp = rlp;
  exportedProperties.forEach(prop => repl.context[prop] = mallet[prop]);

  ReplHistory(repl, path.join(datadir, '.history'));
}

commander
  .name(program.name)
  .description(program.description)
  .version(program.version)
  .option('-d, --datadir <path>', 'Data directory', path.join(os.homedir(), '.mallet2'))
  .arguments('<testnet>')
  .parse(process.argv);

if(commander.args.length != 1) {
  commander.help();
}
else {
  start(commander.datadir, commander.args[0]);
}
//execute inthe Mallet Repl
//mallet kevm -d ./my_data/
//mallet> .load ../test_smartcontract_deploy.js

myAccount = newAccount()

selectAccount(myAccount)

getBalance()

requestFunds()

getBalance()

fs = require("fs");

myContract = fs.readFileSync('_myContract_sol_HelloWorld.bin', 'utf8');

tx = { gas: 470000, data: myContract}

deploymentHash = sendTransaction(tx)

getReceipt(deploymentHash)

myContractAddress = getReceipt(deploymentHash).contractAddress

sendTransaction({to: myContractAddress,gas:10000,arguments: []})

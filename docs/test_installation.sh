# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::Installing%20nodejs%20on%20Ubuntu][Installing nodejs on Ubuntu]]
curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -
sudo apt-get -q install -y nodejs
# Installing nodejs on Ubuntu ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::*Verify%20Node.js%20is%20installed%20with:][Verify Node.js is installed with::1]]
node --version
# Verify Node.js is installed with::1 ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::installing_nvm][installing_nvm]]
curl -s -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
# installing_nvm ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::nvm_default][nvm_default]]
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
# nvm_default ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::nvm_check][nvm_check]]
nvm --version
# nvm_check ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::git_clone][git_clone]]
git clone https://github.com/input-output-hk/mallet
# git_clone ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::cat_nvmrc][cat_nvmrc]]
cd mallet

cat .nvmrc
# cat_nvmrc ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::npm_install][npm_install]]
nvm install 10.16.3
nvm use --silent
# npm_install ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::npm_install][npm_install]]
npm install --silent
# npm_install ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::mallet_versions][mallet_versions]]
./mallet --version
# mallet_versions ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::installing_solc][installing_solc]]
sudo npm install -g solc
# installing_solc ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::verif_solcjs][verif_solcjs]]
solcjs --version
# verif_solcjs ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::helloWorld_sol][helloWorld_sol]]
cat << EOF >myContract.sol
// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;


contract HelloWorld {
  function helloWorld() external pure returns (string memory) {
    return "Hello, World!";
  }
}
EOF
# helloWorld_sol ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::compile_helloWorld][compile_helloWorld]]
solcjs --bin --abi --base-path . ./myContract.sol
# compile_helloWorld ends here

# [[file:~/gh/mallet/docs/mallet_end_to_end_tutorial.org::list_helloWorld][list_helloWorld]]
ls *.bin
# list_helloWorld ends here

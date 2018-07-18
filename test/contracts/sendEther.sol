// Simple contract that can be deployed with some initial ammount of ether and
// then send requested ammount of ether to the requested address by calling its
// public function named a.
contract test {
    function test() payable {}
    function a(address addr, uint amount) returns (uint ret) {
        addr.send(amount);
        return address(this).balance;
    }
}
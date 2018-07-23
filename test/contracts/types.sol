pragma solidity ^0.4.20;

contract Types {
  
  function f(int[] a1, string a2, bytes a3, bytes4 a4, address a5) public pure returns (int[], string, bytes, bytes4, address) {
      return (a1, a2, a3, a4, a5);
  }
}

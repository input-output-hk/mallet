// Simple contract that tests the Collatz conjecture for the non-negative integer x
// by calling its public function run with x.
contract collatz {
    function run(uint x) returns(uint y) {
        while ((y = x) > 1) {
            if (x % 2 == 0) x = evenStep(x);
            else x = oddStep(x);
        }
    }
    function evenStep(uint x) returns(uint y) {
        return x / 2;
    }
    function oddStep(uint x) returns(uint y) {
        return 3 * x + 1;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Test double for the verifier's signer-vs-delegate check.
///
/// A real DelegationContract only lets its delegate call execute(). This one
/// deliberately does not: anyone can call execute(), while getDelegate()
/// names a fixed, unrelated address. If a member registers a contract like
/// this, the chain enforces nothing and only the off-chain verifier check
/// stands between an arbitrary signer and acceptance.
contract PermissiveDelegation {
    address private immutable NAMED_DELEGATE;

    constructor(address namedDelegate_) {
        NAMED_DELEGATE = namedDelegate_;
    }

    function getDelegate() external view returns (address) {
        return NAMED_DELEGATE;
    }

    function execute(address target, bytes calldata data) external {
        (bool success, bytes memory result) = target.call(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
}

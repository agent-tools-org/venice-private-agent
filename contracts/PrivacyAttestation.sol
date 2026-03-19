// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PrivacyAttestation
/// @notice On-chain privacy attestation log for Venice AI private inference
contract PrivacyAttestation {
    struct Attestation {
        address agent;
        string model;
        bytes32 queryHash;
        bool privateMode;
        bool noDataRetention;
        uint256 timestamp;
    }

    Attestation[] private _attestations;

    event AttestationLogged(
        address indexed agent,
        string model,
        bytes32 queryHash,
        bool privateMode,
        bool noDataRetention
    );

    /// @notice Log a privacy attestation for a Venice AI inference call
    function logAttestation(
        string calldata model,
        bytes32 queryHash,
        bool privateMode,
        bool noDataRetention
    ) external {
        _attestations.push(
            Attestation({
                agent: msg.sender,
                model: model,
                queryHash: queryHash,
                privateMode: privateMode,
                noDataRetention: noDataRetention,
                timestamp: block.timestamp
            })
        );

        emit AttestationLogged(
            msg.sender,
            model,
            queryHash,
            privateMode,
            noDataRetention
        );
    }

    /// @notice Get total number of attestations
    function getAttestationCount() external view returns (uint256) {
        return _attestations.length;
    }

    /// @notice Get an attestation by index
    function getAttestation(uint256 index) external view returns (Attestation memory) {
        require(index < _attestations.length, "Index out of bounds");
        return _attestations[index];
    }

    /// @notice Count attestations where privateMode is true
    function getPrivateAttestationCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _attestations.length; i++) {
            if (_attestations[i].privateMode) {
                count++;
            }
        }
        return count;
    }
}

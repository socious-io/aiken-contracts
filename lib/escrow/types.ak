use aiken/transaction/credential.{Address}
use aiken/transaction/value.{AssetName, PolicyId}

pub type MValue =
  Pairs<PolicyId, Pairs<AssetName, Int>>

//Elaine: Three stage escrow contract, docs here: https://meshjs.dev/smart-contracts/escrow
//Stage 1 (initiateEscrow in stock offchain JS): does not have a recipient (party B), it only has a deposit (party A), both assets and matching MValue
//Stage 2 (recipientDeposit in stock offchain JS): add recipient (party B) address and assets, 
//Stage 3.S (completeEscrow in stock offchainJS): multisig transaction. IMPORTANT: both parties must sign. NOTE: we are changing this so it is only fee operator 
//Stage 3.F (cancelEscrow in stock offchainJS): either party (with only 1 signature) may cancel escrow and return assets

pub type EscrowDatum {
  Initiation {
    initiator: Address,
    initiator_assets: MValue,
    fee_address: Address,
    fee_assets: MValue,
  }
  ActiveEscrow {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    recipient_assets: MValue,
    fee_address: Address,
    fee_assets: MValue,
  }
}

pub type EscrowRedeemer {
  RecipientDeposit { recipient: Address, recipient_assets: MValue }
  CancelTrade
  CompleteTrade
}

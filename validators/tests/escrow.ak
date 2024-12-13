use aiken/cbor
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{add, from_asset, from_lovelace, merge}
use escrow
use escrow/types.{
  ActiveEscrow, CancelTrade, CompleteTrade, EscrowDatum, Initiation, MValue,
  RecipientDeposit,
}
use mocktail.{
  complete, mocktail_tx, required_signer_hash, tx_in, tx_in_inline_datum, tx_out,
  tx_out_inline_datum,
}
use mocktail/virgin_address.{mock_pub_key_address, mock_script_address}
use mocktail/virgin_key_hex.{mock_pub_key_hash}
use mocktail/virgin_output_reference.{mock_tx_hash, mock_utxo_ref}

type CancelTestCase {
  is_at_initiation: Bool,
  is_initiator_received_initiator_value: Bool,
  is_initiator_received_fee_value: Bool,
  is_recipient_received_value: Bool,
  // is_fee_received_value: Bool,
  is_initiator_signed: Bool,
  is_recipient_signed: Bool,
  is_fee_signed: Bool,
}

fn test_lovelace() -> MValue {
  [Pair("", [Pair("", 2_000_000)])]
}

fn test_value() -> MValue {
  [Pair("test", [Pair("test", 1)])]
}

fn initiator_address() -> Address {
  mock_pub_key_address(0, None)
}

fn recipient_address() -> Address {
  mock_pub_key_address(1, None)
}

fn fee_address() -> Address {
  mock_pub_key_address(2, None)
}

fn initiation_datum() -> EscrowDatum {
  let initiator_assets: MValue = test_lovelace()
  let fee_assets: MValue = test_lovelace()
  let initiation_datum: EscrowDatum =
    Initiation {
      initiator: initiator_address(),
      initiator_assets,
      fee_address: fee_address(),
      fee_assets,
    }
  // trace @"Initiation datum"
  // trace initiation_datum
  initiation_datum
}

fn active_datum(recipient: Address, recipient_assets: MValue) -> EscrowDatum {
  // if recipient_assets != [] {
  if False {
    fail @"Recipient assets must be empty"
  } else {
    ActiveEscrow {
      initiator: initiator_address(),
      initiator_assets: test_lovelace(),
      recipient,
      recipient_assets,
      fee_address: fee_address(),
      fee_assets: test_lovelace(),
    }
  }
}

fn get_cancel_test_tx(test_case: CancelTestCase) -> Transaction {
  let CancelTestCase {
    is_at_initiation,
    is_initiator_received_initiator_value,
    is_initiator_received_fee_value,
    is_recipient_received_value,
    is_initiator_signed,
    is_recipient_signed,
    is_fee_signed,
  } = test_case

  let initiator_output_value =
    if is_initiator_received_initiator_value {
      from_lovelace(2_000_000)
    } else {
      from_asset("test", "test", 1)
    }
      |> merge(
          if is_initiator_received_fee_value {
            from_lovelace(2_000_000)
          } else {
            from_lovelace(0)
          },
        )

  let recipient_output_value =
    if is_recipient_received_value {
      from_asset("test", "test", 1)
    } else {
      from_lovelace(2_000_000)
    }
  // first half is for initiator->recipient, second half is for fee
  let total_input_lovelace = 2_000_000 + 2_000_000

  trace @"running get_cancel_test_tx"

  mocktail_tx()
    |> tx_in(
        True,
        mock_tx_hash(0),
        1,
        from_lovelace(total_input_lovelace),
        mock_script_address(0, None),
      )
    |> tx_in_inline_datum(is_at_initiation, initiation_datum())
    |> tx_in_inline_datum(
        !is_at_initiation,
        active_datum(
          mock_pub_key_address(1, None),
          [Pair("test", [Pair("test", 1)])],
        ),
      )
    |> tx_out(True, initiator_address(), initiator_output_value)
    |> tx_out(True, recipient_address(), recipient_output_value)
    |> required_signer_hash(is_initiator_signed, mock_pub_key_hash(0))
    |> required_signer_hash(is_recipient_signed, mock_pub_key_hash(1))
    |> required_signer_hash(is_fee_signed, mock_pub_key_hash(2))
    |> complete()
}

test success_cancel() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  trace @"Success cancel called"
  trace unused_mock_datum
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      is_initiator_signed: False,
      is_recipient_signed: False,
      is_fee_signed: True,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test success_cancel_at_initiation() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: True,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      is_initiator_signed: False,
      is_recipient_signed: False,
      is_fee_signed: True,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_at_active_with_initiator_signed() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      is_initiator_signed: True,
      // TODO(Elaine): original test was True, make a version with this
      // we probably want a test variant to make sure fee signing implies (->/iff) success (given well formed)
      // we don't want ANY cancellations to be successful without fee signing
      is_recipient_signed: False,
      is_fee_signed: False,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_at_active_with_recipient_signed() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      is_initiator_signed: False,
      is_recipient_signed: True,
      // used to be True in original test
      is_fee_signed: False,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_at_initiation_without_fee_signature() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: True,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      is_initiator_signed: True,
      is_recipient_signed: True,
      // used to be True in original test
      is_fee_signed: False,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  trace @"running fail_cancel_at_initiation_without_fee_signature"
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_without_fee_signature() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      // is_fee_received_value: True,
      is_initiator_signed: True,
      // TODO(Elaine): we want a variant to test that neither initiator nor recipient can cancel
      is_recipient_signed: True,
      is_fee_signed: False,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_without_initiator_value_returned() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: False,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: True,
      is_initiator_signed: True,
      is_recipient_signed: True,
      is_fee_signed: True,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_without_fee_value_returned_to_initiator() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: False,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: False,
      is_initiator_signed: True,
      is_recipient_signed: True,
      is_fee_signed: True,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_cancel_without_recipient_value_returned() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_initiator_value: True,
      is_initiator_received_fee_value: True,
      is_recipient_received_value: False,
      is_initiator_signed: True,
      is_recipient_signed: True,
      is_fee_signed: True,
    }

  let tx = get_cancel_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

// recipient will be the person recieving pay for their work
type RecipientDepositTestCase {
  is_datum_updated: Bool,
  is_value_deposited: Bool,
  is_initiator_assets_and_fee_deposited: Bool,
}

// NOTE: the reason we're validating the initiator deposit in the recipient deposit
// is because we have no way of validating the initiator deposit in the initiation.
// This is because the initiation is just sending money to the escrow & slapping a datum on it
// which cannot be validated at all, since it doesn't spend anything from escrow.

fn get_deposit_test_tx(test_case: RecipientDepositTestCase) -> Transaction {
  let RecipientDepositTestCase {
    is_datum_updated,
    is_value_deposited,
    is_initiator_assets_and_fee_deposited,
  } = test_case
  // first half is for initiator->recipient, second half is for fee
  let input_value =
    if is_initiator_assets_and_fee_deposited {
      from_lovelace(2_000_000 + 2_000_000)
    } else {
      from_lovelace(2_000_000)
    }
  let output_value =
    input_value
      |> if is_value_deposited {
          add(_, "test", "test", 1)
        } else {
          add(_, "", "", 1_000_000)
        }
  //NOTE(ELAINE, PHF): recipient will be depositing nothing in prod for the time being, all assets have to come from initiation
  // also, PHF = post harvest flow
  mocktail_tx()
    |> tx_in(True, mock_tx_hash(0), 1, input_value, mock_script_address(0, None))
    |> tx_in_inline_datum(True, initiation_datum())
    |> tx_out(True, mock_script_address(0, None), output_value)
    |> tx_out_inline_datum(
        is_datum_updated,
        active_datum(
          mock_pub_key_address(1, None),
          [Pair("test", [Pair("test", 1)])],
        ),
      )
    |> tx_out_inline_datum(!is_datum_updated, initiation_datum())
    |> complete()
}

test success_deposit() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: mock_pub_key_address(1, None),
      recipient_assets: test_value(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_initiator_assets_and_fee_deposited: True,
    }

  let tx = get_deposit_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_without_updating_datum() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: mock_pub_key_address(1, None),
      recipient_assets: test_value(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: False,
      is_value_deposited: True,
      is_initiator_assets_and_fee_deposited: True,
    }

  let tx = get_deposit_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_without_depositing_value() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: mock_pub_key_address(1, None),
      recipient_assets: test_value(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: False,
      is_initiator_assets_and_fee_deposited: True,
    }

  let tx = get_deposit_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_when_invalid_initiator_didnt_deposit_assets_and_fee() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: mock_pub_key_address(1, None),
      recipient_assets: test_value(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_initiator_assets_and_fee_deposited: False,
    }
  let tx = get_deposit_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

type CompleteTestCase {
  is_initiator_signed: Bool,
  is_initiator_received_value: Bool,
  is_recipient_signed: Bool,
  is_recipient_received_value: Bool,
  is_fee_signed: Bool,
  is_fee_received_value: Bool,
}

fn get_complete_test_tx(test_case: CompleteTestCase) -> Transaction {
  let CompleteTestCase {
    is_initiator_signed,
    is_initiator_received_value,
    is_recipient_signed,
    is_recipient_received_value,
    is_fee_signed,
    is_fee_received_value,
  } = test_case
  let input_datum =
    ActiveEscrow {
      initiator: mock_pub_key_address(0, None),
      initiator_assets: test_lovelace(),
      recipient: mock_pub_key_address(1, None),
      recipient_assets: test_value(),
      fee_address: mock_pub_key_address(2, None),
      fee_assets: test_lovelace(),
    }

  mocktail_tx()
    |> required_signer_hash(is_initiator_signed, mock_pub_key_hash(0)) //TODO(Elaine): remove this
    |> required_signer_hash(is_recipient_signed, mock_pub_key_hash(1))
    |> required_signer_hash(is_fee_signed, mock_pub_key_hash(2))
    |> tx_in(
        True,
        mock_tx_hash(0),
        1,
        from_lovelace(2_000_000) |> add("test", "test", 1),
        mock_script_address(0, None),
      )
    |> tx_in_inline_datum(True, input_datum)
    |> tx_out(
        is_initiator_received_value,
        mock_pub_key_address(0, None),
        from_asset("test", "test", 1),
      )
    |> tx_out(
        is_recipient_received_value,
        mock_pub_key_address(1, None),
        from_lovelace(2_000_000),
      )
    |> tx_out(
        is_fee_received_value,
        mock_pub_key_address(2, None),
        from_lovelace(2_000_000),
      )
    |> complete()
}

test success_complete() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: False,
      is_initiator_received_value: True,
      is_recipient_signed: True,
      is_recipient_received_value: True,
      is_fee_signed: True,
      is_fee_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test success_complete_with_fee_signed() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: False,
      is_initiator_received_value: True,
      is_recipient_signed: False,
      is_recipient_received_value: True,
      is_fee_signed: True,
      is_fee_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test success_complete_with_recipient_signed() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: False,
      is_initiator_received_value: True,
      is_recipient_signed: True,
      is_recipient_received_value: True,
      is_fee_signed: False,
      is_fee_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_complete_with_initiator_signed() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: True,
      is_initiator_received_value: True,
      is_recipient_signed: False,
      // NOTE(Elaine): fee signing should make this pass, make a new test
      is_recipient_received_value: True,
      is_fee_signed: False,
      is_fee_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

//NOTE(Elaine): need positive and negative test cases for fee
test fail_complete_without_value_sent_to_initiator() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: True,
      is_initiator_received_value: False,
      is_recipient_signed: True,
      is_recipient_received_value: True,
      is_fee_signed: True,
      is_fee_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_complete_without_value_sent_to_recipient() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  trace @"fail complete without value sent to recipient test"
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: True,
      is_initiator_received_value: True,
      is_recipient_signed: True,
      is_recipient_received_value: False,
      is_fee_signed: True,
      is_fee_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  let ctx = ScriptContext { purpose: Spend(output_reference), transaction: tx }
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

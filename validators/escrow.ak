use aiken/transaction.{
  InlineDatum, ScriptContext, Spend, Transaction, find_input,
}
use aiken/transaction/value.{from_asset_list, merge}
use escrow/types.{
  ActiveEscrow, CancelTrade, CompleteTrade, EscrowDatum, EscrowRedeemer,
  Initiation, RecipientDeposit,
}
use vodka_address.{address_pub_key}
use vodka_extra_signatories.{all_key_signed, key_signed, one_of_keys_signed}
use vodka_inputs.{inputs_at}
use vodka_outputs.{outputs_at}
use vodka_value.{get_all_value_to, value_geq}

validator {
  pub fn escrow(_datum: EscrowDatum, redeemer: EscrowRedeemer, ctx: ScriptContext) {
    when ctx.purpose is {
      Spend(utxo) -> {
        let Transaction { inputs, outputs, extra_signatories, .. } =
          ctx.transaction
        expect Some(own_input) = find_input(inputs, utxo)
        let own_address = own_input.output.address
        when redeemer is {
          RecipientDeposit { recipient, recipient_assets } -> {
            expect ([input], [output]) =
              (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
            // Only 1 input & output from same address
            expect InlineDatum(raw_input_datum) = input.output.datum
            expect InlineDatum(raw_output_datum) = output.datum
            expect Initiation { initiator, initiator_assets, fee_address, fee_assets }: EscrowDatum = raw_input_datum
            expect output_datum: EscrowDatum = raw_output_datum
            let is_datum_updated =
              output_datum == ActiveEscrow {
                initiator,
                recipient,
                initiator_assets,
                recipient_assets,
                fee_address,
                fee_assets,
              }
            let is_value_deposited =
              value_geq(
                output.value,
                input.output.value
                  |> merge(
                      recipient_assets
                        |> from_asset_list()
                        |> merge(fee_assets |> from_asset_list()),
                    ),
              )

            // TODO(Elaine): need to check this is correct
            // let is_fee_deposited = 
            is_datum_updated && is_value_deposited
          }
          CancelTrade -> {
            expect ([input], []) =
              (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
            expect InlineDatum(raw_input_datum) = input.output.datum
            expect input_datum: EscrowDatum = raw_input_datum
            when input_datum is {
              Initiation { initiator, .. } -> {
                expect Some(pub_key) = address_pub_key(initiator)
                key_signed(extra_signatories, pub_key)
              }

              ActiveEscrow {
                initiator,
                recipient,
                initiator_assets,
                recipient_assets,
                fee_address,
                fee_assets,
              } -> {
                // fee quantity unused when cancelling
                let initiator_received = get_all_value_to(outputs, initiator)
                let recipient_received = get_all_value_to(outputs, recipient)
                let is_initiator_received_value =
                  value_geq(
                    initiator_received,
                    initiator_assets |> from_asset_list(),
                  )
                let is_recipient_received_value =
                  value_geq(
                    recipient_received,
                    recipient_assets |> from_asset_list(),
                  )
                expect Some(initiator_pub_key) = address_pub_key(initiator)
                expect Some(recipient_pub_key) = address_pub_key(recipient)
                expect Some(fee_pub_key) = address_pub_key(fee_address)
                // let is_any_party_signed =
                //   one_of_keys_signed(
                //     extra_signatories,
                //     [initiator_pub_key, recipient_pub_key],
                //   )
                let is_fee_signed = key_signed(extra_signatories, fee_pub_key)

                // Only admin can cancel trade, in which case, no fee is charged, and assets are returned
                // is_any_party_signed && is_initiator_received_value && is_recipient_received_value
                is_fee_signed && is_initiator_received_value && is_recipient_received_value
              }
            }
          }
          CompleteTrade -> {
            expect ([input], []) =
              (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
            expect InlineDatum(raw_input_datum) = input.output.datum
            expect ActiveEscrow {
              initiator,
              recipient,
              initiator_assets,
              recipient_assets,
              fee_address,
              fee_assets,
            }: EscrowDatum = raw_input_datum
            let initiator_received = get_all_value_to(outputs, initiator)
            let recipient_received = get_all_value_to(outputs, recipient)
            let fee_recipient_recieved = get_all_value_to(outputs, fee_address)
            let is_initiator_received_value =
              value_geq(
                initiator_received,
                recipient_assets |> from_asset_list(),
              )
            let is_recipient_received_value =
              value_geq(
                recipient_received,
                initiator_assets |> from_asset_list(),
              )
            let is_fee_received_value =
              value_geq(fee_recipient_recieved, fee_assets |> from_asset_list())
            expect Some(initiator_pub_key) = address_pub_key(initiator)
            expect Some(recipient_pub_key) = address_pub_key(recipient)
            expect Some(fee_pub_key) = address_pub_key(fee_address)

            // let is_both_parties_signed =
            //   all_key_signed(
            //     extra_signatories,
            //     [initiator_pub_key, recipient_pub_key],
            //   )
            // Escrow can only be completed either by admin, or by party A (Initiator). Party B consent (worker) not required
            let is_signed =
              one_of_keys_signed(
                extra_signatories,
                [fee_pub_key, initiator_pub_key],
              )

            is_signed && is_initiator_received_value && is_recipient_received_value
          }
        }
      }

      _ -> False
    }
  }

}

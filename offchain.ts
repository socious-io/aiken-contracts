import {
    ConStr0,
    conStr0,
    ConStr1,
    conStr1,
    DEFAULT_REDEEMER_BUDGET,
    mConStr1,
    mConStr2,
    MeshValue,
    PubKeyAddress,
    pubKeyAddress,
    Value,
    value,
  } from "@meshsdk/common";
  import {
    Asset,
    deserializeAddress,
    deserializeDatum,
    mergeAssets,
    serializeAddressObj,
    UTxO,
  } from "@meshsdk/core";
  import { applyParamsToScript } from "@meshsdk/core-csl";
  
  import { MeshTxInitiator, MeshTxInitiatorInput } from "./common";
  import blueprint from "./plutus.json";
  
  export type InitiationDatum =
  //       initiator      assets  fee           assets
  ConStr0<[PubKeyAddress, Value, PubKeyAddress, Value]>;
export const initiateEscrowDatum = (
  walletAddress: string,
  amount: Asset[],
  feeAddress: string,
  feeAmount: Asset[],
): InitiationDatum => {
  const { pubKeyHash, stakeCredentialHash } = deserializeAddress(walletAddress);
  const { pubKeyHash: feePubKeyHash, stakeCredentialHash: feeStakeCredentialHash } = deserializeAddress(feeAddress);
  return conStr0([
    pubKeyAddress(pubKeyHash, stakeCredentialHash),
    value(amount),
    pubKeyAddress(feePubKeyHash, feeStakeCredentialHash),
    value(feeAmount),
  ]);
};
  
export type ActiveEscrowDatum = ConStr1<
  // initiator     assets  recipient     assets   fee           assets
  [PubKeyAddress, Value, PubKeyAddress, Value, PubKeyAddress, Value]
>;
export const activeEscrowDatum = (
  initiationDatum: InitiationDatum,
  recipient_address: string,
  recipient_assets: Asset[],
  feeAddress: string,
  feeAmount: Asset[],
): ActiveEscrowDatum => {
  const { pubKeyHash, stakeCredentialHash } = deserializeAddress(recipient_address);
  const [initiator, initiatorAmount] = initiationDatum.fields;
  const { pubKeyHash: feePubKeyHash, stakeCredentialHash: feeStakeCredentialHash } = deserializeAddress(feeAddress);
  return conStr1([
    initiator,
    initiatorAmount,
    pubKeyAddress(pubKeyHash, stakeCredentialHash),
    value(recipient_assets),
    pubKeyAddress(feePubKeyHash, feeStakeCredentialHash),
    value(feeAmount),
  ]);
};
  
export type RecipientDepositRedeemer = ConStr0<[PubKeyAddress, Value]>;
// export const recipientDepositRedeemer = (recipient: string, depositAmount: Asset[]) =>
// initiateEscrowDatum(recipient, depositAmount);
//NOTE(Elaine): Previous version of this relied on the CBOR coincidentally being identical
// between initiation datum and recipient deposit redeemer. This is no longer the case after fees

export const recipientDepositRedeemer = (recipient: string, depositAmount: Asset[]) => {
  const { pubKeyHash, stakeCredentialHash } = deserializeAddress(recipient);
  return conStr0([pubKeyAddress(pubKeyHash, stakeCredentialHash), value(depositAmount)]);
};
  
  export class MeshEscrowContract extends MeshTxInitiator {
    scriptCbor: string;
    scriptAddress: string;
  
    constructor(inputs: MeshTxInitiatorInput) {
      super(inputs);
      this.scriptCbor = this.getScriptCbor();
      this.scriptAddress = this.getScriptAddress(this.scriptCbor);
    }
  
    getScriptCbor = () => {
        return applyParamsToScript(blueprint.validators[0]!.compiledCode, []);
    //   switch (this.version) {
    //     case 2:
    //       return applyParamsToScript(blueprintV2.validators[0]!.compiledCode, []);
    //     default:
    //       return applyParamsToScript(blueprintV1.validators[0]!.compiledCode, []);
    //   }
    };
  
    initiateEscrow = async (escrowAmount: Asset[], feeAddress: string, feeAmount: Asset[]): Promise<string> => {
        const { utxos, collateral, walletAddress } = await this.getWalletInfoForTx();
        console.log(`utxos: ${JSON.stringify(utxos)}`);
    
        const tx = this.mesh
          .txOut(this.scriptAddress, escrowAmount)
          .txOutInlineDatumValue(initiateEscrowDatum(walletAddress, escrowAmount, feeAddress, feeAmount), 'JSON')
          .changeAddress(walletAddress)
          //FIXME(Elaine, PHF): this might not be necessary since it wasnt present in the original
          // but it was present in the original for NFT vending machine which is newer so maybe necessary
        //   .txInCollateral(
        //     collateral.input.txHash,
        //     collateral.input.outputIndex,
        //     collateral.output.amount,
        //     collateral.output.address,
        //     )
          .selectUtxosFrom(utxos);

        const finishedTx = await tx.complete();
        
        return this.mesh.txHex;
      };
  
      cancelEscrow = async (escrowUtxo: UTxO): Promise<string> => {
        const { utxos, walletAddress, collateral } = await this.getWalletInfoForTx();
    
        const inputDatum = deserializeDatum<InitiationDatum | ActiveEscrowDatum>(escrowUtxo.output.plutusData!);
    
        if (inputDatum.constructor === 1) {
          const [initiatorAddressObj, initiatorAmount, recipientAddressObj, recipientAmount] = inputDatum.fields;
    
          const initiatorAddress = serializeAddressObj(initiatorAddressObj, this.networkId);
          const recipientAddress = serializeAddressObj(recipientAddressObj!, this.networkId);
          const initiatorToReceive = MeshValue.fromValue(initiatorAmount).toAssets();
          const recipientToReceive = MeshValue.fromValue(recipientAmount!).toAssets();
          this.mesh.txOut(initiatorAddress, initiatorToReceive).txOut(recipientAddress, recipientToReceive);
        }
    
        await this.mesh
          .spendingPlutusScript(this.languageVersion)
          .txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, this.scriptAddress)
          .spendingReferenceTxInInlineDatumPresent()
          .spendingReferenceTxInRedeemerValue(mConStr1([]))
          .txInScript(this.scriptCbor)
          .requiredSignerHash(deserializeAddress(walletAddress).pubKeyHash)
          .changeAddress(walletAddress)
          .txInCollateral(
            collateral.input.txHash,
            collateral.input.outputIndex,
            collateral.output.amount,
            collateral.output.address,
          )
          .selectUtxosFrom(utxos)
          .complete();
        return this.mesh.txHex;
      };
  
      recipientDeposit = async (escrowUtxo: UTxO, depositAmount: Asset[]): Promise<string> => {
        const { utxos, walletAddress, collateral } = await this.getWalletInfoForTx();
    
        const inputDatum = deserializeDatum<InitiationDatum>(escrowUtxo.output.plutusData!);
        const feeAddress = inputDatum.fields[2];
        const feeAmount = MeshValue.fromValue(inputDatum.fields[3]).toAssets();
        const outputDatum = activeEscrowDatum(inputDatum, walletAddress, depositAmount, String(feeAddress), feeAmount);
        //NOTE(Elaine): we can get the fee info from the inputDatum
    
        const inputAssets = MeshValue.fromValue(inputDatum.fields[1]).toAssets();
        const escrowAmount = mergeAssets([...depositAmount, ...inputAssets]);
    
        await this.mesh
          .spendingPlutusScript(this.languageVersion)
          .txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, this.scriptAddress)
          .spendingReferenceTxInInlineDatumPresent()
          .txInRedeemerValue(recipientDepositRedeemer(walletAddress, depositAmount), 'JSON', DEFAULT_REDEEMER_BUDGET)
          .txInScript(this.scriptCbor)
          .txOut(this.scriptAddress, escrowAmount)
          .txOutInlineDatumValue(outputDatum, 'JSON')
          .changeAddress(walletAddress)
          .txInCollateral(
            collateral.input.txHash,
            collateral.input.outputIndex,
            collateral.output.amount,
            collateral.output.address,
          )
          .selectUtxosFrom(utxos)
          .complete();
        return this.mesh.txHex;
      };
  
      completeEscrow = async (escrowUtxo: UTxO): Promise<string> => {
        const { utxos, walletAddress, collateral } = await this.getWalletInfoForTx();
    
        const inputDatum = deserializeDatum<ActiveEscrowDatum>(escrowUtxo.output.plutusData!);
        const [initiatorAddressObj, initiatorAmount, recipientAddressObj, recipientAmount] = inputDatum.fields;
        const initiatorAddress = serializeAddressObj(initiatorAddressObj, this.networkId);
        const recipientAddress = serializeAddressObj(recipientAddressObj, this.networkId);
        const initiatorToReceive = MeshValue.fromValue(recipientAmount).toAssets();
        const recipientToReceive = MeshValue.fromValue(initiatorAmount).toAssets();
    
        await this.mesh
          .spendingPlutusScript(this.languageVersion)
          .txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, this.scriptAddress)
          .spendingReferenceTxInInlineDatumPresent()
          .spendingReferenceTxInRedeemerValue(mConStr2([]))
          .txInScript(this.scriptCbor)
          .txOut(initiatorAddress, initiatorToReceive)
          .txOut(recipientAddress, recipientToReceive)
          .requiredSignerHash(deserializeAddress(recipientAddress).pubKeyHash)
          .requiredSignerHash(deserializeAddress(initiatorAddress).pubKeyHash)
          .changeAddress(walletAddress)
          .txInCollateral(
            collateral.input.txHash,
            collateral.input.outputIndex,
            collateral.output.amount,
            collateral.output.address,
          )
          .selectUtxosFrom(utxos)
          .complete();
        return this.mesh.txHex;
      };
  
    getUtxoByTxHash = async (txHash: string): Promise<UTxO | undefined> => {
      return await this._getUtxoByTxHash(txHash, this.scriptCbor);
    };
  }
import blueprint from "./plutus.json";
import {
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
  BlockfrostProvider,
  MeshWallet,
  Transaction,
  serializePlutusScript,
  MeshTxBuilder,
} from '@meshsdk/core';
import fs from 'node:fs';
import { MeshEscrowContract } from "./offchain";
import { toLovelace } from "@meshsdk/core-csl";
 
export const demo = async () => {
  if (process.env.BLOCKFROST_API_KEY === undefined) {
    throw new Error("BLOCKFROST_API_KEY environment variable not set");
  }
  const blockchainProvider = new BlockfrostProvider(process.env.BLOCKFROST_API_KEY);
  
  // const initiatorWallet = new MeshWallet({
  //   networkId: 0,
  //   fetcher: blockchainProvider,
  //   submitter: blockchainProvider,
  //   key: {
  //     type: 'root',
  //     bech32: fs.readFileSync('me.sk').toString(),
  //   },
  // });
  const mnemonic_words = process.env.PAYMENT_MNEMONIC?.split(" ");
  if (mnemonic_words === undefined) {
    throw new Error("PAYMENT_MNEMONIC environment variable not set or invalid");
  }
  const initiatorWallet = new MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: 'mnemonic',
      words: mnemonic_words,
    },
  });

  // const escrowScript = blueprint.validators[0]!.compiledCode;

  const usedAddresses = await initiatorWallet.getUsedAddresses();
  const unusedAddresses = await initiatorWallet.getUnusedAddresses();
  // get the first address in usedAddresses, if usedAddresses is non-empty
  // otherwise, get the first address in unusedAddresses

  //FIXME(Elaine, PHF): revamp this logic at some point the unused addresses index is weird
  const initiatorAddress = usedAddresses.length > 0 ? usedAddresses[0]! : unusedAddresses[0]!;// const unusedAddresses = await wallet.getUnusedAddresses();
  const recipientAddress = usedAddresses.length > 1 ? usedAddresses[1]! : unusedAddresses[1]!;
  // const feeAddress = usedAddresses.length > 2 ? usedAddresses[2]! : unusedAddresses[2]!;

  const feeAddress = "addr_test1qp95qrtmvha8hlgz6haj2776zkrjfsnvj9sxltkp20x778y6gxgenz3s9mr4rml7fclgxm9a4tyghgg4qyrxdx9zenaq2dghzd"

  console.log(`length of usedAddresses: ${usedAddresses.length}`);
  console.log(`Initiator address: ${initiatorAddress}, Recipient address: ${recipientAddress}, Fee address: ${feeAddress}`);


  // const datum = {
  //   value: {
  //     alternative: 0,
  //     fields: [initiatorAddress, fee],
  //   },
  // };

  // const serializedScript = serializePlutusScript(
  //   { code: escrowScript, version: "V3" },
  //   undefined,//FIXME(Elaine, PHF): Put SOCIO address here
  //   0
  // );
  
  // const unsignedTx = await new Transaction({ initiator: wallet }).sendLovelace(
  //   {
  //     address: serializedScript.address,
  //     datum: datum,
  //   },
  //   "1000000"
  // ).build();
  
  // const signedTx = await wallet.signTx(unsignedTx);
  
  // const txHash = await wallet.submitTx(signedTx);
  
  // console.log(`1 preview testnet ADA locked. This is only ADA with a datum that does not constitute a valid escrow initiation. Contract at:
  //     Tx ID: ${txHash}
  //     Datum: ${JSON.stringify(datum)}
  // `);

  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
  })

  const contract = new MeshEscrowContract(
    {
    mesh: meshTxBuilder,
    fetcher: blockchainProvider,
    wallet: initiatorWallet,
    networkId: 0,
    },
    //TODO(Elaine, PHF): If we bake the fee into the contract rememmber to put the parameter here
  )

  const initiateEscrowTx = await contract.initiateEscrow(
    [{
      unit: "lovelace",
      quantity: String(toLovelace(3)) // escrow amount of 3 ada
    }], // escrow amount
    feeAddress,
    [{unit: "lovelace",
      quantity: String(1) // fee of 1 ada
    }]// fee amount
  )

  const initiateEscrowTxSigned = await initiatorWallet.signTx(initiateEscrowTx)
  const initiateEscrowTxID = await initiatorWallet.submitTx(initiateEscrowTxSigned)
  console.log(`Escrow initiated. Tx ID: ${initiateEscrowTxID}`);

  console.log("Waiting for transaction to be confirmed...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // wait 30 seconds
  //FIXME(Elaine, PHF): Either blockfrost or mesh (I forgot) has a function to wait for a tx to be confirmed

  const initiateEscrowTxUtxo = await contract.getUtxoByTxHash(initiateEscrowTxID)
  if (initiateEscrowTxUtxo === undefined) {
    throw new Error("Could not find the utxo for the initiate escrow tx, maybe still pending");
  }

  const recipientDepositTx = await contract.recipientDeposit(
    initiateEscrowTxUtxo,
    [] // nothing for recipient deposit
  )

  //FIXME(Elain, PHF): this will not work. escrow contracts do not seem to support I R and F being the same
  // import multiple contracts
  // const recipientDepositTxSigned = await initiatorWallet.signTx(recipientDepositTx)
  // const recipientDepositTxID = await initiatorWallet.submitTx(recipientDepositTxSigned)
  // console.log(`Recipient deposit made. Tx ID: ${recipientDepositTxID}`);

  // console.log("Waiting for transaction to be confirmed...");
  // await new Promise(resolve => setTimeout(resolve, 30000)); // wait 30 seconds

  // const recipientDepositTxUtxo = await contract.getUtxoByTxHash(recipientDepositTxID)
  // if (recipientDepositTxUtxo === undefined) {
  //   throw new Error("Could not find the utxo for the recipient deposit tx, maybe still pending");
  // }

  // const recipientWithdrawTx = await contract.completeEscrow(
  //   recipientDepositTxUtxo
  // )
  // const recipientWithdrawTxSigned = await initiatorWallet.signTx(recipientWithdrawTx)
  // const recipientWithdrawTxID = await initiatorWallet.submitTx(recipientWithdrawTxSigned)
  // console.log(`Recipient withdraw made. Tx ID: ${recipientWithdrawTxID}`);

}

if (require.main === module) {
  demo();
}

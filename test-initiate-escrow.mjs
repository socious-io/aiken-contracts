import cbor from "cbor";
import {
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
  BlockfrostProvider,
  MeshWallet,
  Transaction,
} from '@meshsdk/core';
import fs from 'node:fs';
 
const blockchainProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID);
 
const wallet = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: 'root',
    bech32: fs.readFileSync('me.sk').toString(),
  },
});
 
const blueprint = JSON.parse(fs.readFileSync('./plutus.json'));
 
const script = {
  code: cbor
    .encode(Buffer.from(blueprint.validators[0].compiledCode, "hex"))
    .toString("hex"),
  version: "V3",
};
 
const owner = resolvePaymentKeyHash((await wallet.getUsedAddresses())[0]);
 
const datum = {
  value: {
    alternative: 0,
    fields: [owner],
  },
};
 
const unsignedTx = await new Transaction({ initiator: wallet }).sendLovelace(
  {
    address: resolvePlutusScriptAddress(script, 0),
    datum,
  },
  "1000000"
).build();
 
const signedTx = await wallet.signTx(unsignedTx);
 
const txHash = await wallet.submitTx(signedTx);
 
console.log(`1 preview testnet ADA locked. This is only ADA with a datum that does not constitute a valid escrow initiation. Contract at:
    Tx ID: ${txHash}
    Datum: ${JSON.stringify(datum)}
`);
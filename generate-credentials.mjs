import { MeshWallet } from '@meshsdk/core';
import fs from 'node:fs';
 
const secret_key = MeshWallet.brew(true);
 
fs.writeFileSync('me.sk', secret_key);
 
const wallet = new MeshWallet({
  networkId: 0,
  key: {
    type: 'root',
    bech32: secret_key,
  },
});
 
fs.writeFileSync('me.addr', wallet.getUnusedAddresses()[0]);
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var aiken_contracts_exports = {};
__export(aiken_contracts_exports, {
  MeshEscrowContract: () => MeshEscrowContract,
  activeEscrowDatum: () => activeEscrowDatum,
  demo: () => demo,
  initiateEscrowDatum: () => initiateEscrowDatum,
  recipientDepositRedeemer: () => recipientDepositRedeemer
});
module.exports = __toCommonJS(aiken_contracts_exports);

// test-initiate-escrow.ts
var import_core3 = require("@meshsdk/core");

// offchain.ts
var import_common = require("@meshsdk/common");
var import_core2 = require("@meshsdk/core");
var import_core_csl = require("@meshsdk/core-csl");

// common.ts
var import_core = require("@meshsdk/core");
var MeshTxInitiator = class {
  mesh;
  fetcher;
  wallet;
  stakeCredential;
  networkId = 0;
  version = 2;
  languageVersion = "V2";
  constructor({
    mesh,
    fetcher,
    wallet,
    networkId = 0,
    stakeCredential = "c08f0294ead5ab7ae0ce5471dd487007919297ba95230af22f25e575",
    version = 2
  }) {
    this.mesh = mesh;
    if (fetcher) {
      this.fetcher = fetcher;
    }
    if (wallet) {
      this.wallet = wallet;
    }
    this.networkId = networkId;
    switch (this.networkId) {
      case 1:
        this.mesh.setNetwork("mainnet");
        break;
      default:
        this.mesh.setNetwork("preprod");
    }
    this.version = version;
    switch (this.version) {
      case 1:
        this.languageVersion = "V2";
        break;
      default:
        this.languageVersion = "V3";
    }
    if (stakeCredential) {
      this.stakeCredential = stakeCredential;
    }
  }
  getScriptAddress = (scriptCbor) => {
    const { address } = (0, import_core.serializePlutusScript)(
      { code: scriptCbor, version: this.languageVersion },
      this.stakeCredential,
      this.networkId
    );
    return address;
  };
  signSubmitReset = async () => {
    const signedTx = this.mesh.completeSigning();
    const txHash = await this.mesh.submitTx(signedTx);
    this.mesh.reset();
    return txHash;
  };
  queryUtxos = async (walletAddress) => {
    if (this.fetcher) {
      const utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
      return utxos;
    }
    return [];
  };
  getWalletDappAddress = async () => {
    if (this.wallet) {
      const usedAddresses = await this.wallet.getUsedAddresses();
      if (usedAddresses.length > 0) {
        return usedAddresses[0];
      }
      const unusedAddresses = await this.wallet.getUnusedAddresses();
      if (unusedAddresses.length > 0) {
        return unusedAddresses[0];
      }
    }
    return "";
  };
  getWalletCollateral = async () => {
    if (this.wallet) {
      const utxos = await this.wallet.getCollateral();
      return utxos[0];
    }
    return void 0;
  };
  getWalletUtxosWithMinLovelace = async (lovelace, providedUtxos = []) => {
    let utxos = providedUtxos;
    if (this.wallet && (!providedUtxos || providedUtxos.length === 0)) {
      utxos = await this.wallet.getUtxos();
    }
    return utxos.filter((u) => {
      const lovelaceAmount = u.output.amount.find(
        (a) => a.unit === "lovelace"
      )?.quantity;
      return Number(lovelaceAmount) > lovelace;
    });
  };
  getWalletUtxosWithToken = async (assetHex, userUtxos = []) => {
    let utxos = userUtxos;
    if (this.wallet && userUtxos.length === 0) {
      utxos = await this.wallet.getUtxos();
    }
    return utxos.filter((u) => {
      const assetAmount = u.output.amount.find(
        (a) => a.unit === assetHex
      )?.quantity;
      return Number(assetAmount) >= 1;
    });
  };
  getAddressUtxosWithMinLovelace = async (walletAddress, lovelace, providedUtxos = []) => {
    let utxos = providedUtxos;
    if (this.fetcher && (!providedUtxos || providedUtxos.length === 0)) {
      utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
    }
    return utxos.filter((u) => {
      const lovelaceAmount = u.output.amount.find(
        (a) => a.unit === "lovelace"
      )?.quantity;
      return Number(lovelaceAmount) > lovelace;
    });
  };
  getAddressUtxosWithToken = async (walletAddress, assetHex, userUtxos = []) => {
    let utxos = userUtxos;
    if (this.fetcher && userUtxos.length === 0) {
      utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
    }
    return utxos.filter((u) => {
      const assetAmount = u.output.amount.find(
        (a) => a.unit === assetHex
      )?.quantity;
      return Number(assetAmount) >= 1;
    });
  };
  getWalletInfoForTx = async () => {
    const utxos = await this.wallet?.getUtxos();
    const collateral = await this.getWalletCollateral();
    const walletAddress = await this.getWalletDappAddress();
    if (!utxos || utxos?.length === 0) {
      throw new Error("No utxos found");
    }
    if (!collateral) {
      throw new Error("No collateral found");
    }
    if (!walletAddress) {
      throw new Error("No wallet address found");
    }
    return { utxos, collateral, walletAddress };
  };
  _getUtxoByTxHash = async (txHash, scriptCbor) => {
    if (this.fetcher) {
      const utxos = await this.fetcher?.fetchUTxOs(txHash);
      let scriptUtxo = utxos[0];
      if (scriptCbor) {
        const scriptAddr = (0, import_core.serializePlutusScript)(
          { code: scriptCbor, version: this.languageVersion },
          this.stakeCredential,
          this.networkId
        ).address;
        scriptUtxo = utxos.filter((utxo) => utxo.output.address === scriptAddr)[0] || utxos[0];
      }
      return scriptUtxo;
    }
    return void 0;
  };
};

// plutus.json
var plutus_default = {
  preamble: {
    title: "socious-io/socious-smart-contracts",
    version: "0.0.0",
    plutusVersion: "v2",
    compiler: {
      name: "Aiken",
      version: "v1.0.29-alpha+16fb02e"
    },
    license: "N/A"
  },
  validators: [
    {
      title: "escrow.escrow",
      datum: {
        title: "_datum",
        schema: {
          $ref: "#/definitions/escrow~1types~1EscrowDatum"
        }
      },
      redeemer: {
        title: "redeemer",
        schema: {
          $ref: "#/definitions/escrow~1types~1EscrowRedeemer"
        }
      },
      compiledCode: "590d4501000032323232323232232323232323232232322533300d3232533300f300c3010375400226464646464646464a66602e602a60306ea80044c8c8c8c8c8c8c8c8c8c94ccc084c07c0244c8c8c8c8c8c8c94ccc0acc0b800c4c94ccc0b0c0bc00c4c94ccc0a8c080c0acdd5000899192999816181118169baa001132533302d302b302e375400626464646464646464a66607060760042646464646464a66607666ebc03ccdd2a40046607e01a6607e6e9802ccc0fc064cc0fcdd300c1981f8049981f9ba60074bd7008008a503301d3756605a60786ea8048cc07cdd59816981e1baa302d303c37540266603e604002e604000c606401a66064008464660686eacc0f00088c8dd6981f0011bae303c001375c6074002606400a6606000c464660646eacc0e80088c8dd6981e0011bae303a001375c6070002606000e2c6eacc0e4004c0e4008c0dc004c0dc008dd5981a800981a801181980098179baa003163031302e37540022c601e605a6ea800cc0bcc0b0dd50008b180698159baa301c302b37540042c605a0042c60580046eb0c0acc0b0008dd61815000998141ba73300401300d33028374e6600a02201a97ae0375660506052004604e00260466ea80604c8c8c94ccc090c0840304c8c8c8c94ccc0acc0b800c54ccc0ac0084c94ccc0a4c07cc0a8dd5000899192999815981498161baa002132533302c302a302d37540022660140306eb8c0c4c0b8dd50008b1804181818169baa0021323232323232323232323232533303730353038375400226464a666072606e60746ea80044c8c94ccc0ecc0e4c0f0dd50008a99981d9980c8139bae3040303d37540022a66607600e200c29405280b180b8041bae303e303b37540022c602a0126eb8c0f0c0e4dd50008b18098051980c1980a011003180d9bab303a0053301733013021008301a3756607200e6eacc0e0c0e4008c0dc004c0dc004c0d8008c0d0004c0d0004c0cc008c0c4004c0b4dd50011811800981718159baa00116300c302a3754603660546ea80045858c0b0008dd6181598160011bac302a00133028374e6600802601a660506e9ccc0140440352f5c0264646464a666056605c0062a666056004264a666052603e60546ea80044c94ccc0a8c09cc0acdd50008991919191919191919191919299981c981e0010991919191919191919192999820181f18209baa00113232533304230403043375400226464a6660886084608a6ea800454ccc110c8cc004004cc124c128c11cdd5001198249ba90054bd701129998248008a50132533304733025033375c609800429444cc00c00c004c13000454ccc11001c40185280a50163020010375c608e60886ea800458c078048dd7182298211baa00116301c014330213301d02b00f3024011330203301c02a012302300c3301b02900933035006232330373756607e0044646eb4c104008dd7181f8009bae303d001303500733033008232330353756607a0044646eb4c0fc008dd7181e8009bae303b00130330093303100a23233033375660760044646eb4c0f4008dd7181d8009bae3039001303100b16375660740026074004607000260700046eacc0d8004c0d8008c0d0004c0d0008dd598190009819001181800098161baa00116302e302b37540022c601860546ea8c06cc0a8dd50008b0b18160011bac302b302c00237586054002660506e9ccc01004c034cc0a0dd399802808806a5eb808c94ccc094c08cc098dd50008980819814981518139baa0014bd700a60103d87a800030153026375400244646600200200644a66605200229404c94ccc09ccdc79bae302c00200414a2266006006002605800244646600200200644a666050002297adef6c601332253330273375e603060526ea80080144cc030004dd5980d18149baa0021001302a00133002002302b001223300400223375e6028604a6ea8c058c094dd50008011119801801119baf30133024375400200444646600200200644a66604a002297ae013232533302430050021330280023300400400113300400400130290023027001223233001001323300100100322533302500114bd7009919991119198008008019129998158008801899198169ba73302d375200c6605a60540026605a605600297ae033003003302f002302d001375c60480026eacc094004cc00c00cc0a4008c09c004894ccc09000452889929998111919b89375a600e002664464a66604c6046604e6ea8004520001375a605660506ea8004c94ccc098c08cc09cdd50008a60103d87a8000132330010013756605860526ea8008894ccc0ac004530103d87a8000132323232533302c337220100042a66605866e3c0200084c05ccc0c0dd4000a5eb80530103d87a8000133006006003375a605a0066eb8c0ac008c0bc008c0b4004c8cc004004024894ccc0a80045300103d87a8000132323232533302b337220100042a66605666e3c0200084c058cc0bcdd3000a5eb80530103d87a8000133006006003375660580066eb8c0a8008c0b8008c0b0004dd7180a0009bae30160013758604e0042660060060022940c09c0048c088c08cc08c00488c8ccc00400400c0088894ccc08c00840044c8ccc010010c09c00ccccc020008dd718110009bab3023001222325333025533302800114a229405300103d87a80001301033029374c00297ae032333001001003002222533302a0021001132333004004302e0033322323300100100522533302f001133030337606ea4010dd4001a5eb7bdb1804c8c8c8c94ccc0c0cdc800400109981a19bb037520106ea001c01454ccc0c0cdc78040010992999818981798191baa001133035337606ea4024c0d8c0ccdd5000802080219299981898178008a60103d87a80001301c33035375000297ae03370000e00226606866ec0dd48011ba800133006006003375a60620066eb8c0bc008c0cc008c0c4004dd718148009bad302a001302c00230250022323300100100222533302000114bd6f7b6300999119191999804001801000911319190011919198008008019129998138008a4c264a6660500022a66604a60086eb4c09cc0a8008526161323232325333029337206eb8c0a8010dd718150018a9998149804000899803803998168018010b0b1bad302a003302d003302b002302a002302a001233302230200014a0944dd598110019bae3020002302200133002002302300122223233001001005225333022001133023337606ea4014dd300225eb7bdb1804c8c8c8c94ccc08ccdc800480109981399bb037520126e9802001454ccc08ccdc78048010992999812181118129baa001133028337606ea4028c0a4c098dd5000802080219980380480400089981399bb037520046e98004cc01801800cdd598120019bae3022002302600230240013019375401e601060326ea8c028c064dd5180e180c9baa0011632323300100100722533301c00114c0103d87a800013232533301b3375e6018603a6ea80080144c018cc07c0092f5c02660080080026040004603c002603660306ea8020dd2a40006eb0c064c068c068c068c068c068c068008dd6180c000980c180c0011bac301600130123754600260246ea80108c054004528180098081baa00223013301400114984d958c94ccc030c0280044c8c8c8c94ccc04cc0580084c8c9263300b0022323300d3756602a0044646eb4c05c008dd7180a8009bae3013001300b003163756602800260280046024002601c6ea800c54ccc030c02400454ccc03cc038dd50018a4c2c2a66601860040022a66601e601c6ea800c5261616300c37540046e1d20043001007232533300930070011323232323232323253330143017002132323232498cc0380108c8cc040dd5980c0011191bad301a002375c60300026eb8c058004c038014cc0300188c8cc038dd5980b0011191bad3018002375c602c0026eb8c050004c03001c58dd5980a800980a801180980098098011bab30110013011002300f001300b37540042a666012600c0022646464646464646464646464a66603060360042646464646464931980a0031191980b1bab301e002232375a60400046eb8c078004dd7180e000980a003998090041191980a1bab301c002232375a603c0046eb8c070004dd7180d000980900499808005119198091bab301a002232375a60380046eb8c068004dd7180c00098080058b1bab30190013019002301700130170023756602a002602a004602600260260046eacc044004c044008c03c004c02cdd50010b18049baa00122323300100100322533300d00114984c8cc00c00cc044008c00cc03c00494ccc018c010c01cdd5000899191919299980698080010991924c64a666018601400226464a666022602800426493192999807980680089919299980a180b80109924c601a0022c602a00260226ea800854ccc03cc0300044c8c8c8c8c8c94ccc060c06c00852616375a603200260320046eb4c05c004c05c008dd6980a80098089baa00216300f37540022c6024002601c6ea800c54ccc030c02400454ccc03cc038dd50018a4c2c2c60186ea8008c01800c58c038004c038008c030004c020dd50008b1192999803180200089919299980598070010a4c2c6eb8c030004c020dd50010a999803180180089919299980598070010a4c2c6eb8c030004c020dd50010b18031baa001370e90011b87480015cd2ab9d5573caae7d5d02ba15745",
      hash: "cf2437e2823cbede335b296b78bf028c22ed25f200c9e5937f4eab7e"
    }
  ],
  definitions: {
    ByteArray: {
      dataType: "bytes"
    },
    Int: {
      dataType: "integer"
    },
    List$Pair$ByteArray_Int: {
      dataType: "map",
      keys: {
        $ref: "#/definitions/ByteArray"
      },
      values: {
        $ref: "#/definitions/Int"
      }
    },
    List$Pair$ByteArray_List$Pair$ByteArray_Int: {
      dataType: "map",
      keys: {
        $ref: "#/definitions/ByteArray"
      },
      values: {
        $ref: "#/definitions/List$Pair$ByteArray_Int"
      }
    },
    "Option$aiken/transaction/credential/Referenced$aiken/transaction/credential/Credential": {
      title: "Optional",
      anyOf: [
        {
          title: "Some",
          description: "An optional value.",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              $ref: "#/definitions/aiken~1transaction~1credential~1Referenced$aiken~1transaction~1credential~1Credential"
            }
          ]
        },
        {
          title: "None",
          description: "Nothing.",
          dataType: "constructor",
          index: 1,
          fields: []
        }
      ]
    },
    "aiken/transaction/credential/Address": {
      title: "Address",
      description: "A Cardano `Address` typically holding one or two credential references.\n\n Note that legacy bootstrap addresses (a.k.a. 'Byron addresses') are\n completely excluded from Plutus contexts. Thus, from an on-chain\n perspective only exists addresses of type 00, 01, ..., 07 as detailed\n in [CIP-0019 :: Shelley Addresses](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0019/#shelley-addresses).",
      anyOf: [
        {
          title: "Address",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "payment_credential",
              $ref: "#/definitions/aiken~1transaction~1credential~1Credential"
            },
            {
              title: "stake_credential",
              $ref: "#/definitions/Option$aiken~1transaction~1credential~1Referenced$aiken~1transaction~1credential~1Credential"
            }
          ]
        }
      ]
    },
    "aiken/transaction/credential/Credential": {
      title: "Credential",
      description: "A general structure for representing an on-chain `Credential`.\n\n Credentials are always one of two kinds: a direct public/private key\n pair, or a script (native or Plutus).",
      anyOf: [
        {
          title: "VerificationKeyCredential",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              $ref: "#/definitions/ByteArray"
            }
          ]
        },
        {
          title: "ScriptCredential",
          dataType: "constructor",
          index: 1,
          fields: [
            {
              $ref: "#/definitions/ByteArray"
            }
          ]
        }
      ]
    },
    "aiken/transaction/credential/Referenced$aiken/transaction/credential/Credential": {
      title: "Referenced",
      description: "Represent a type of object that can be represented either inline (by hash)\n or via a reference (i.e. a pointer to an on-chain location).\n\n This is mainly use for capturing pointers to a stake credential\n registration certificate in the case of so-called pointer addresses.",
      anyOf: [
        {
          title: "Inline",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              $ref: "#/definitions/aiken~1transaction~1credential~1Credential"
            }
          ]
        },
        {
          title: "Pointer",
          dataType: "constructor",
          index: 1,
          fields: [
            {
              title: "slot_number",
              $ref: "#/definitions/Int"
            },
            {
              title: "transaction_index",
              $ref: "#/definitions/Int"
            },
            {
              title: "certificate_index",
              $ref: "#/definitions/Int"
            }
          ]
        }
      ]
    },
    "escrow/types/EscrowDatum": {
      title: "EscrowDatum",
      anyOf: [
        {
          title: "Initiation",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "initiator",
              $ref: "#/definitions/aiken~1transaction~1credential~1Address"
            },
            {
              title: "initiator_assets",
              $ref: "#/definitions/List$Pair$ByteArray_List$Pair$ByteArray_Int"
            },
            {
              title: "fee_address",
              $ref: "#/definitions/aiken~1transaction~1credential~1Address"
            },
            {
              title: "fee_assets",
              $ref: "#/definitions/List$Pair$ByteArray_List$Pair$ByteArray_Int"
            }
          ]
        },
        {
          title: "ActiveEscrow",
          dataType: "constructor",
          index: 1,
          fields: [
            {
              title: "initiator",
              $ref: "#/definitions/aiken~1transaction~1credential~1Address"
            },
            {
              title: "initiator_assets",
              $ref: "#/definitions/List$Pair$ByteArray_List$Pair$ByteArray_Int"
            },
            {
              title: "recipient",
              $ref: "#/definitions/aiken~1transaction~1credential~1Address"
            },
            {
              title: "recipient_assets",
              $ref: "#/definitions/List$Pair$ByteArray_List$Pair$ByteArray_Int"
            },
            {
              title: "fee_address",
              $ref: "#/definitions/aiken~1transaction~1credential~1Address"
            },
            {
              title: "fee_assets",
              $ref: "#/definitions/List$Pair$ByteArray_List$Pair$ByteArray_Int"
            }
          ]
        }
      ]
    },
    "escrow/types/EscrowRedeemer": {
      title: "EscrowRedeemer",
      anyOf: [
        {
          title: "RecipientDeposit",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "recipient",
              $ref: "#/definitions/aiken~1transaction~1credential~1Address"
            },
            {
              title: "recipient_assets",
              $ref: "#/definitions/List$Pair$ByteArray_List$Pair$ByteArray_Int"
            }
          ]
        },
        {
          title: "CancelTrade",
          dataType: "constructor",
          index: 1,
          fields: []
        },
        {
          title: "CompleteTrade",
          dataType: "constructor",
          index: 2,
          fields: []
        }
      ]
    }
  }
};

// offchain.ts
var initiateEscrowDatum = (walletAddress, amount, feeAddress, feeAmount) => {
  const { pubKeyHash, stakeCredentialHash } = (0, import_core2.deserializeAddress)(walletAddress);
  const { pubKeyHash: feePubKeyHash, stakeCredentialHash: feeStakeCredentialHash } = (0, import_core2.deserializeAddress)(feeAddress);
  return (0, import_common.conStr0)([
    (0, import_common.pubKeyAddress)(pubKeyHash, stakeCredentialHash),
    (0, import_common.value)(amount),
    (0, import_common.pubKeyAddress)(feePubKeyHash, feeStakeCredentialHash),
    (0, import_common.value)(feeAmount)
  ]);
};
var activeEscrowDatum = (initiationDatum, recipient_address, recipient_assets, feeAddress, feeAmount) => {
  const { pubKeyHash, stakeCredentialHash } = (0, import_core2.deserializeAddress)(recipient_address);
  const [initiator, initiatorAmount] = initiationDatum.fields;
  const { pubKeyHash: feePubKeyHash, stakeCredentialHash: feeStakeCredentialHash } = (0, import_core2.deserializeAddress)(feeAddress);
  return (0, import_common.conStr1)([
    initiator,
    initiatorAmount,
    (0, import_common.pubKeyAddress)(pubKeyHash, stakeCredentialHash),
    (0, import_common.value)(recipient_assets),
    (0, import_common.pubKeyAddress)(feePubKeyHash, feeStakeCredentialHash),
    (0, import_common.value)(feeAmount)
  ]);
};
var recipientDepositRedeemer = (recipient, depositAmount) => {
  const { pubKeyHash, stakeCredentialHash } = (0, import_core2.deserializeAddress)(recipient);
  return (0, import_common.conStr0)([(0, import_common.pubKeyAddress)(pubKeyHash, stakeCredentialHash), (0, import_common.value)(depositAmount)]);
};
var MeshEscrowContract = class extends MeshTxInitiator {
  scriptCbor;
  scriptAddress;
  constructor(inputs) {
    super(inputs);
    this.scriptCbor = this.getScriptCbor();
    this.scriptAddress = this.getScriptAddress(this.scriptCbor);
  }
  getScriptCbor = () => {
    return (0, import_core_csl.applyParamsToScript)(plutus_default.validators[0].compiledCode, []);
  };
  initiateEscrow = async (escrowAmount, feeAddress, feeAmount) => {
    const { utxos, collateral, walletAddress } = await this.getWalletInfoForTx();
    console.log(`utxos: ${JSON.stringify(utxos)}`);
    const tx = this.mesh.txOut(this.scriptAddress, escrowAmount).txOutInlineDatumValue(initiateEscrowDatum(walletAddress, escrowAmount, feeAddress, feeAmount), "JSON").changeAddress(walletAddress).selectUtxosFrom(utxos);
    const finishedTx = await tx.complete();
    return this.mesh.txHex;
  };
  cancelEscrow = async (escrowUtxo) => {
    const { utxos, walletAddress, collateral } = await this.getWalletInfoForTx();
    const inputDatum = (0, import_core2.deserializeDatum)(escrowUtxo.output.plutusData);
    if (inputDatum.constructor === 1) {
      const [initiatorAddressObj, initiatorAmount, recipientAddressObj, recipientAmount] = inputDatum.fields;
      const initiatorAddress = (0, import_core2.serializeAddressObj)(initiatorAddressObj, this.networkId);
      const recipientAddress = (0, import_core2.serializeAddressObj)(recipientAddressObj, this.networkId);
      const initiatorToReceive = import_common.MeshValue.fromValue(initiatorAmount).toAssets();
      const recipientToReceive = import_common.MeshValue.fromValue(recipientAmount).toAssets();
      this.mesh.txOut(initiatorAddress, initiatorToReceive).txOut(recipientAddress, recipientToReceive);
    }
    await this.mesh.spendingPlutusScript(this.languageVersion).txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, this.scriptAddress).spendingReferenceTxInInlineDatumPresent().spendingReferenceTxInRedeemerValue((0, import_common.mConStr1)([])).txInScript(this.scriptCbor).requiredSignerHash((0, import_core2.deserializeAddress)(walletAddress).pubKeyHash).changeAddress(walletAddress).txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address
    ).selectUtxosFrom(utxos).complete();
    return this.mesh.txHex;
  };
  recipientDeposit = async (escrowUtxo, depositAmount) => {
    const { utxos, walletAddress, collateral } = await this.getWalletInfoForTx();
    const inputDatum = (0, import_core2.deserializeDatum)(escrowUtxo.output.plutusData);
    const feeAddress = inputDatum.fields[2];
    const feeAmount = import_common.MeshValue.fromValue(inputDatum.fields[3]).toAssets();
    const outputDatum = activeEscrowDatum(inputDatum, walletAddress, depositAmount, String(feeAddress), feeAmount);
    const inputAssets = import_common.MeshValue.fromValue(inputDatum.fields[1]).toAssets();
    const escrowAmount = (0, import_core2.mergeAssets)([...depositAmount, ...inputAssets]);
    await this.mesh.spendingPlutusScript(this.languageVersion).txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, this.scriptAddress).spendingReferenceTxInInlineDatumPresent().txInRedeemerValue(recipientDepositRedeemer(walletAddress, depositAmount), "JSON", import_common.DEFAULT_REDEEMER_BUDGET).txInScript(this.scriptCbor).txOut(this.scriptAddress, escrowAmount).txOutInlineDatumValue(outputDatum, "JSON").changeAddress(walletAddress).txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address
    ).selectUtxosFrom(utxos).complete();
    return this.mesh.txHex;
  };
  completeEscrow = async (escrowUtxo) => {
    const { utxos, walletAddress, collateral } = await this.getWalletInfoForTx();
    const inputDatum = (0, import_core2.deserializeDatum)(escrowUtxo.output.plutusData);
    const [initiatorAddressObj, initiatorAmount, recipientAddressObj, recipientAmount] = inputDatum.fields;
    const initiatorAddress = (0, import_core2.serializeAddressObj)(initiatorAddressObj, this.networkId);
    const recipientAddress = (0, import_core2.serializeAddressObj)(recipientAddressObj, this.networkId);
    const initiatorToReceive = import_common.MeshValue.fromValue(recipientAmount).toAssets();
    const recipientToReceive = import_common.MeshValue.fromValue(initiatorAmount).toAssets();
    await this.mesh.spendingPlutusScript(this.languageVersion).txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, this.scriptAddress).spendingReferenceTxInInlineDatumPresent().spendingReferenceTxInRedeemerValue((0, import_common.mConStr2)([])).txInScript(this.scriptCbor).txOut(initiatorAddress, initiatorToReceive).txOut(recipientAddress, recipientToReceive).requiredSignerHash((0, import_core2.deserializeAddress)(recipientAddress).pubKeyHash).requiredSignerHash((0, import_core2.deserializeAddress)(initiatorAddress).pubKeyHash).changeAddress(walletAddress).txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address
    ).selectUtxosFrom(utxos).complete();
    return this.mesh.txHex;
  };
  getUtxoByTxHash = async (txHash) => {
    return await this._getUtxoByTxHash(txHash, this.scriptCbor);
  };
};

// test-initiate-escrow.ts
var import_core_csl2 = require("@meshsdk/core-csl");
var demo = async () => {
  if (process.env.BLOCKFROST_API_KEY === void 0) {
    throw new Error("BLOCKFROST_API_KEY environment variable not set");
  }
  const blockchainProvider = new import_core3.BlockfrostProvider(process.env.BLOCKFROST_API_KEY);
  const mnemonic_words = process.env.PAYMENT_MNEMONIC?.split(" ");
  if (mnemonic_words === void 0) {
    throw new Error("PAYMENT_MNEMONIC environment variable not set or invalid");
  }
  const initiatorWallet = new import_core3.MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: "mnemonic",
      words: mnemonic_words
    }
  });
  const usedAddresses = await initiatorWallet.getUsedAddresses();
  const unusedAddresses = await initiatorWallet.getUnusedAddresses();
  const initiatorAddress = usedAddresses.length > 0 ? usedAddresses[0] : unusedAddresses[0];
  const recipientAddress = usedAddresses.length > 1 ? usedAddresses[1] : unusedAddresses[1];
  const feeAddress = "addr_test1qp95qrtmvha8hlgz6haj2776zkrjfsnvj9sxltkp20x778y6gxgenz3s9mr4rml7fclgxm9a4tyghgg4qyrxdx9zenaq2dghzd";
  console.log(`length of usedAddresses: ${usedAddresses.length}`);
  console.log(`Initiator address: ${initiatorAddress}, Recipient address: ${recipientAddress}, Fee address: ${feeAddress}`);
  const meshTxBuilder = new import_core3.MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true
  });
  const contract = new MeshEscrowContract(
    {
      mesh: meshTxBuilder,
      fetcher: blockchainProvider,
      wallet: initiatorWallet,
      networkId: 0
    }
    //TODO(Elaine, PHF): If we bake the fee into the contract rememmber to put the parameter here
  );
  const initiateEscrowTx = await contract.initiateEscrow(
    [{
      unit: "lovelace",
      quantity: String((0, import_core_csl2.toLovelace)(3))
      // escrow amount of 3 ada
    }],
    // escrow amount
    feeAddress,
    [{
      unit: "lovelace",
      quantity: String(1)
      // fee of 1 ada
    }]
    // fee amount
  );
  const initiateEscrowTxSigned = await initiatorWallet.signTx(initiateEscrowTx);
  const initiateEscrowTxID = await initiatorWallet.submitTx(initiateEscrowTxSigned);
  console.log(`Escrow initiated. Tx ID: ${initiateEscrowTxID}`);
  console.log("Waiting for transaction to be confirmed...");
  await new Promise((resolve) => setTimeout(resolve, 3e4));
  const initiateEscrowTxUtxo = await contract.getUtxoByTxHash(initiateEscrowTxID);
  if (initiateEscrowTxUtxo === void 0) {
    throw new Error("Could not find the utxo for the initiate escrow tx, maybe still pending");
  }
  const recipientDepositTx = await contract.recipientDeposit(
    initiateEscrowTxUtxo,
    []
    // nothing for recipient deposit
  );
};
if (require.main === module) {
  demo();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MeshEscrowContract,
  activeEscrowDatum,
  demo,
  initiateEscrowDatum,
  recipientDepositRedeemer
});

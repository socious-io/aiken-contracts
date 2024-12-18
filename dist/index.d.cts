import { ConStr0, PubKeyAddress, Value, ConStr1 } from '@meshsdk/common';
import { MeshTxBuilder, IFetcher, IWallet, LanguageVersion, UTxO, Asset } from '@meshsdk/core';

declare const demo: () => Promise<void>;

type MeshTxInitiatorInput = {
    mesh: MeshTxBuilder;
    fetcher?: IFetcher;
    wallet?: IWallet;
    networkId?: number;
    stakeCredential?: string;
    version?: number;
};
declare class MeshTxInitiator {
    mesh: MeshTxBuilder;
    fetcher?: IFetcher;
    wallet?: IWallet;
    stakeCredential?: string;
    networkId: number;
    version: number;
    languageVersion: LanguageVersion;
    constructor({ mesh, fetcher, wallet, networkId, stakeCredential, version, }: MeshTxInitiatorInput);
    getScriptAddress: (scriptCbor: string) => string;
    protected signSubmitReset: () => Promise<string | undefined>;
    protected queryUtxos: (walletAddress: string) => Promise<UTxO[]>;
    protected getWalletDappAddress: () => Promise<string | undefined>;
    protected getWalletCollateral: () => Promise<UTxO | undefined>;
    protected getWalletUtxosWithMinLovelace: (lovelace: number, providedUtxos?: UTxO[]) => Promise<UTxO[]>;
    protected getWalletUtxosWithToken: (assetHex: string, userUtxos?: UTxO[]) => Promise<UTxO[]>;
    protected getAddressUtxosWithMinLovelace: (walletAddress: string, lovelace: number, providedUtxos?: UTxO[]) => Promise<UTxO[]>;
    protected getAddressUtxosWithToken: (walletAddress: string, assetHex: string, userUtxos?: UTxO[]) => Promise<UTxO[]>;
    protected getWalletInfoForTx: () => Promise<{
        utxos: UTxO[];
        collateral: UTxO;
        walletAddress: string;
    }>;
    protected _getUtxoByTxHash: (txHash: string, scriptCbor?: string) => Promise<UTxO | undefined>;
}

type InitiationDatum = ConStr0<[PubKeyAddress, Value, PubKeyAddress, Value]>;
declare const initiateEscrowDatum: (walletAddress: string, amount: Asset[], feeAddress: string, feeAmount: Asset[]) => InitiationDatum;
type ActiveEscrowDatum = ConStr1<[
    PubKeyAddress,
    Value,
    PubKeyAddress,
    Value,
    PubKeyAddress,
    Value
]>;
declare const activeEscrowDatum: (initiationDatum: InitiationDatum, recipient_address: string, recipient_assets: Asset[], feeAddress: string, feeAmount: Asset[]) => ActiveEscrowDatum;
type RecipientDepositRedeemer = ConStr0<[PubKeyAddress, Value]>;
declare const recipientDepositRedeemer: (recipient: string, depositAmount: Asset[]) => ConStr0<(PubKeyAddress | Value)[]>;
declare class MeshEscrowContract extends MeshTxInitiator {
    scriptCbor: string;
    scriptAddress: string;
    constructor(inputs: MeshTxInitiatorInput);
    getScriptCbor: () => string;
    initiateEscrow: (escrowAmount: Asset[], feeAddress: string, feeAmount: Asset[]) => Promise<string>;
    cancelEscrow: (escrowUtxo: UTxO) => Promise<string>;
    recipientDeposit: (escrowUtxo: UTxO, depositAmount: Asset[]) => Promise<string>;
    completeEscrow: (escrowUtxo: UTxO) => Promise<string>;
    getUtxoByTxHash: (txHash: string) => Promise<UTxO | undefined>;
}

export { type ActiveEscrowDatum, type InitiationDatum, MeshEscrowContract, type RecipientDepositRedeemer, activeEscrowDatum, demo, initiateEscrowDatum, recipientDepositRedeemer };

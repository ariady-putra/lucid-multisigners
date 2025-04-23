import { useState } from "react";
import { Button } from "@heroui/button";
import { Address, CML, Data, fromHex, Lucid, LucidEvolution, paymentCredentialOf, PaymentKeyHash, WalletApi } from "@lucid-evolution/lucid";
import { Wallet } from "@/types/cardano";
import { network, provider } from "@/config/lucid";
import * as PaymentToken from "@/config/paymentToken";
import { getErrorMessage } from "@/components/utils";

export default function Home() {
  //#region Wallet Connector
  function getWallets() {
    const wallets: Wallet[] = [];
    const { cardano } = window;

    for (const c in cardano) {
      const wallet = cardano[c];

      if (!wallet.apiVersion) continue;

      wallets.push(wallet);
    }

    return wallets.sort((l, r) => {
      return l.name.toUpperCase() < r.name.toUpperCase() ? -1 : 1;
    });
  }

  const wallets = getWallets();
  //#endregion

  //#region Wallet Connection
  type Connection = {
    api: WalletApi;
    lucid: LucidEvolution;
    address: Address;
    pkh: PaymentKeyHash;
  };

  const [connection, setConnection] = useState<Connection>();

  async function connectWallet(wallet: Wallet): Promise<Connection> {
    const [api, lucid] = await Promise.all([wallet.enable(), Lucid(provider, network)]);
    lucid.selectWallet.fromAPI(api);

    const address = await lucid.wallet().address();
    const pkh = paymentCredentialOf(address).hash;

    return { api, lucid, address, pkh };
  }
  //#endregion

  //#region Minting
  async function mintPaymentToken({ lucid, api }: Connection) {
    if (!lucid.wallet()) lucid.selectWallet.fromAPI(api);

    const redeemer = Data.void();
    const tx = await lucid
      .newTx()
      .mintAssets({ [PaymentToken.assetUnit]: 1n }, redeemer)
      .attach.MintingPolicy(PaymentToken.mintingValidator)
      .complete();

    const txSigned = await tx.sign.withWallet().complete();
    const txHash = await txSigned.submit();

    return txHash;
  }
  //#endregion

  //#region Payment
  async function payWithPaymentToken({ lucid, api, address }: Connection) {
    if (!lucid.wallet()) lucid.selectWallet.fromAPI(api);

    const vendorPK = "................................................................";
    const vendorAddress = "addr_test1qpyw97punq98fplqcwv5cnf4are34qvl9zmdhyv6r37cltp0v9xv2x47ynm7pgyrkvcnqgq3mt5ugx8wycecwgqhcr3q5eksf6";

    const vendorUTXOs = (await lucid.utxosAt(vendorAddress)).filter((utxo) => Object.keys(utxo.assets).length === 1); // filter out other tokens
    const vendorFunds = vendorUTXOs.reduce((sum, { assets }) => sum + assets.lovelace, 0n);

    const addressUTXOs = await lucid.wallet().getUtxos();

    const buildTx = (fee: bigint) =>
      lucid
        .newTx()
        .collectFrom([...vendorUTXOs, ...addressUTXOs])
        .pay.ToAddress(vendorAddress, { lovelace: vendorFunds - fee, [PaymentToken.assetUnit]: 1n })
        .pay.ToAddress(address, { lovelace: fee })
        .complete();

    const simulateTx = await buildTx(0n);
    const fee = simulateTx.toTransaction().body().fee();

    const tx = await buildTx(2n * fee); // (1n * fee) if you want to make the user pay for the network fee, something like https://youtu.be/DAxM1LgVvpQ

    const vendorPKbytes = fromHex(vendorPK);
    const vendorPKbech32 = CML.PrivateKey.from_normal_bytes(vendorPKbytes).to_bech32();
    const txSigned = await tx.assemble([await tx.partialSign.withPrivateKey(vendorPKbech32), await tx.partialSign.withWallet()]).complete();
    const txHash = await txSigned.submit();

    return txHash;
  }
  //#endregion

  const [result, setResult] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {wallets.map((wallet, w) => (
          <Button
            key={`wallet.${w}`}
            className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
            radius="full"
            onPress={() => connectWallet(wallet).then(setConnection).catch(console.error)}
          >
            {wallet.name}
          </Button>
        ))}
      </div>

      {connection && (
        <div className="flex flex-col gap-3">
          <span className="mx-3">{connection.address}</span>

          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-gradient-to-tr from-yellow-500 to-pink-500 text-white shadow-lg"
              radius="full"
              onPress={() =>
                mintPaymentToken(connection)
                  .then((txHash) => setResult(`Mint TxHash: ${txHash}`))
                  .catch((error) => setResult(`Mint Error: ${getErrorMessage(error)}`))
              }
            >
              Mint a Payment Token
            </Button>

            <Button
              className="bg-gradient-to-tr from-yellow-500 to-pink-500 text-white shadow-lg"
              radius="full"
              onPress={() =>
                payWithPaymentToken(connection)
                  .then((txHash) => setResult(`Pay TxHash: ${txHash}`))
                  .catch((error) => setResult(`Pay Error: ${getErrorMessage(error)}`))
              }
            >
              Pay with Payment Token
            </Button>
          </div>

          <span className="mx-3">{result}</span>
        </div>
      )}
    </div>
  );
}

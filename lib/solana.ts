// Points + badges are mirrored to Solana (devnet by default) as Memo transactions: a public,
// append-only receipt of every award. Postgres stays the source of truth for the app.
// No SOLANA_SECRET_KEY => no-op, so the app runs without a wallet.
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

let payer: any = null;
let conn: any = null;

export function solanaEnabled() {
  return !!process.env.SOLANA_SECRET_KEY;
}

export async function recordOnChain(memo: string): Promise<string | null> {
  if (!solanaEnabled()) return null;
  try {
    const web3 = await import("@solana/web3.js");
    payer ??= web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY!)));
    conn ??= new web3.Connection(process.env.SOLANA_RPC_URL || web3.clusterApiUrl("devnet"), "confirmed");
    const ix = new web3.TransactionInstruction({
      keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
      programId: new web3.PublicKey(MEMO_PROGRAM),
      data: Buffer.from(memo.slice(0, 500), "utf8"),
    });
    return await web3.sendAndConfirmTransaction(conn, new web3.Transaction().add(ix), [payer]);
  } catch (e) {
    console.warn("[solana] memo failed:", (e as Error).message);
    return null;
  }
}

export function explorerUrl(sig: string) {
  const cluster = (process.env.SOLANA_RPC_URL || "devnet").includes("mainnet") ? "" : "?cluster=devnet";
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

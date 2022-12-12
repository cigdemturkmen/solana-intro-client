import * as Web3 from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, Transaction, TransactionInstruction } from "@solana/web3.js";
dotenv.config(); // loads env file contents into process.env. returns an object with a parsed key if successfull.

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"));
  const signer = await initializeKeypair(connection);

  console.log("Signer public key :" + signer.publicKey.toBase58());

  pingProgram(connection, signer );
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

//My Notes
// By telling the network which accounts we need to interact with and if we're writing to them, the Solana runtime knows which transactions it can run in parallel. This is part of why Solana is so fast!

const PROGRAM_ID = new Web3.PublicKey("ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa")
// executable code and stateful data are stored separately on Solana! :
const PROGRAM_DATA_PUBLIC_KEY = new Web3.PublicKey("Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod") // account that stores the data for the program

async function initializeKeypair(connection: Web3.Connection): Promise<Web3.Keypair> {
  if (!process.env.PRIVATE_KEY) { // NODEJS.Process.env
    console.log("Generating new keypair... 🗝️");
    const signer = Keypair.generate();

    await airdropSolIfNeeded(signer, connection);

    console.log("Creating .env file");
    fs.writeFileSync(".env", `PRIVATE_KEY=[${signer.secretKey.toString()}]`); // when assigning a property on process.env, its type should be string.
    return signer;
  } 

  const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = Keypair.fromSecretKey(secretKey);

  await airdropSolIfNeeded(keypairFromSecret, connection);
  return keypairFromSecret;
}

async function airdropSolIfNeeded(signer: Web3.Keypair, connection: Web3.Connection) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log('Current balance is', balance / LAMPORTS_PER_SOL, 'SOL');

  // 1 SOL should be enough for almost anything you wanna do
  if (balance / LAMPORTS_PER_SOL < 1) {
    // You can only get up to 2 SOL per request 
    console.log('Airdropping 1 SOL...');
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log('New balance is', newBalance / LAMPORTS_PER_SOL, 'SOL');
  }
}

async function pingProgram(connection: Web3.Connection, payer: Web3.Keypair) {
  const transaction = new Transaction()
  const instruction = new TransactionInstruction({
    // 1. The public keys of all the accounts the instruction will read/write.
    keys: [
      {
        pubkey: PROGRAM_DATA_PUBLIC_KEY,
        isSigner: false,
        isWritable: true
      }
    ],
    
    // 2. The ID of the program this instruction will be sent to
    programId: PROGRAM_ID
    
    // 3. Data - in this case, there's none!
  })

  transaction.add(instruction)
  const transactionSignature = await Web3.sendAndConfirmTransaction(connection, transaction, [payer])

  console.log(
    `Transaction https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}




  //My Notes
  // Error: airdrop to G8F2JB1mdwiGjHLEDZ4jcMiTx7F1RYddLFNsHm19bGV7 failed: Internal error at Connection.requestAirdrop (C:\Users\Hp...) happens when you ask for more than 2 SOL or ask too frequent. (?)
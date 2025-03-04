import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SevenSeas } from "../target/types/seven_seas";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getMint,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token"; 
import fs from "fs";
import { Keypair } from "@solana/web3.js";

let mint = new anchor.web3.PublicKey("tokNTPpdBjMeLz1pHRmWgoUJ9sQ1VqxcE431B7adeYv");

describe("seven-seas", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SevenSeas as Program<SevenSeas>;
  const player = anchor.web3.Keypair.generate();
  let tokenOwner = new Uint8Array(JSON.parse(fs.readFileSync("ownSX1SCfotCS3TMmkZtnrGPdjsVwf5E9sAG94eNQS2.json").toString()));
  let tokenOwnerKeypair = Keypair.fromSecretKey(tokenOwner);

  console.log("Local signer is: ", player.publicKey.toBase58());

  it("Initialize!", async () => {
    
    let confirmOptions = {
      skipPreflight: true,
    };

    console.log(new Date(), "requesting airdrop");
    let airdropTx = await anchor.getProvider().connection.requestAirdrop(
      player.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    let res = await anchor.getProvider().connection.confirmTransaction(airdropTx);
    airdropTx = await anchor.getProvider().connection.requestAirdrop(
      tokenOwnerKeypair.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    res = await anchor.getProvider().connection.confirmTransaction(airdropTx);

    let key = new Uint8Array(JSON.parse(fs.readFileSync("tokNTPpdBjMeLz1pHRmWgoUJ9sQ1VqxcE431B7adeYv.json").toString()));

    let tokenKeypair = Keypair.fromSecretKey(key);

    const mint = await createMint(
      anchor.getProvider().connection,
      tokenOwnerKeypair,
      tokenOwnerKeypair.publicKey,
      tokenOwnerKeypair.publicKey,
      9, // We are using 9 decimals to match the CLI decimal default exactly, 
      tokenKeypair    
    );
    
    let [tokenAccountOwnerPda, bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_account_owner_pda", "utf8")],
      program.programId
    );
    
    let [token_vault, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault", "utf8"), mint.toBuffer()],
      program.programId
    );
    
    console.log("Mint address: " + mint.toBase58());
    
    let mintInfo = await getMint(anchor.getProvider().connection, mint);
    console.log("Mint Supply" + mintInfo.supply.toString());
    const mintDecimals = Math.pow(10, mintInfo.decimals);
    
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      player,
      mint,
      tokenOwnerKeypair.publicKey
    );

    console.log("SenderTokeAccount: " + playerTokenAccount.address.toBase58());
    console.log("VaultAccount: " + token_vault);
    console.log("TokenAccountOwnerPda: " + tokenAccountOwnerPda);

    const mintToPlayerResult = await mintTo(
      anchor.getProvider().connection,
      player,
      mint,
      playerTokenAccount.address,
      tokenOwnerKeypair,
      10000000 * mintDecimals // 10000000 Token with 9 decimals
    );
    console.log("mint sig: " + mintToPlayerResult);
    await anchor.getProvider().connection.confirmTransaction(mintToPlayerResult, "confirmed");

    let tokenAccountInfo = await getAccount(anchor.getProvider().connection, playerTokenAccount.address);
      console.log(
        "Owned player token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
      );

    console.log("Play tokens: " + (10000000 * mintDecimals).toString());

    const [level] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("level")],
      program.programId
    );
    
    const [chestVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("chestVault")],
      program.programId
    );
    
    const [gameActions] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("gameActions")],
      program.programId
    );
    
    const tx = await program.methods.initialize()
    .accounts({
      signer: player.publicKey,
      newGameDataAccount: level,
      chestVault: chestVault,
      gameActions: gameActions,
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: token_vault,
      mintOfTokenBeingSent: mint,
      systemProgram: anchor.web3.SystemProgram.programId,      
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Your transaction signature", tx);

    // Now that all accounts are there mint some tokens to the program token vault
    const mintToProgramResult = await mintTo(
      anchor.getProvider().connection,
      player,
      mint,
      token_vault,
      tokenOwnerKeypair,
      10000000 * mintDecimals // 10000000 Token with 9 decimals
    );
    console.log("mint sig: " + mintToProgramResult);
    await anchor.getProvider().connection.confirmTransaction(mintToProgramResult, "confirmed");

  });

  it("Init Ship!", async () => {    
    let confirmOptions = {
      skipPreflight: true,
    };

    console.log(new Date(), "requesting airdrop");
    let airdropTx = await anchor.getProvider().connection.requestAirdrop(
      player.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    const res = await anchor.getProvider().connection.confirmTransaction(airdropTx);

    const [shipPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ship"), player.publicKey.toBuffer()],
      program.programId
    );

    let [token_vault, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault", "utf8"), mint.toBuffer()],
      program.programId
    );

    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      player,
      mint,
      player.publicKey
    );

    let mintInfo = await getMint(anchor.getProvider().connection, mint);
    console.log("Mint Supply" + mintInfo.supply.toString());
    const mintDecimals = Math.pow(10, mintInfo.decimals);

    const mintToPlayerResult = await mintTo(
      anchor.getProvider().connection,
      player,
      mint,
      playerTokenAccount.address,
      tokenOwnerKeypair,
      1000000 * mintDecimals, // 10000000 Token with 9 decimals
      [],
      confirmOptions
    );
    console.log("mint sig: " + mintToPlayerResult);
    await anchor.getProvider().connection.confirmTransaction(mintToPlayerResult, "confirmed");

    let tokenAccountInfo = await getAccount(anchor.getProvider().connection, playerTokenAccount.address);
      console.log(
        "Owned player token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
      );

    console.log("Play tokens: " + (10000000 * mintDecimals).toString());

    let tx = await program.methods.initializeShip()
    .accounts({
      newShip: shipPDA,
      signer: player.publicKey,
      nftAccount: player.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Init ship transaction", tx);
    
    tx = await program.methods.upgradeShip()
    .accounts({
      newShip: shipPDA,
      signer: player.publicKey,
      nftAccount: player.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      vaultTokenAccount: token_vault,
      mintOfTokenBeingSent: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      playerTokenAccount: playerTokenAccount.address,    
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Upgrade ship transaction", tx);
        

    tx = await program.methods.upgradeShip()
    .accounts({
      newShip: shipPDA,
      signer: player.publicKey,
      nftAccount: player.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      vaultTokenAccount: token_vault,
      mintOfTokenBeingSent: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      playerTokenAccount: playerTokenAccount.address,    
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Upgrade ship transaction", tx);
    
  });

  it("Spawn ship!", async () => {

    console.log(new Date(), "requesting airdrop");
    let airdropTx = await anchor.getProvider().connection.requestAirdrop(
      player.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    let confirmOptions = {
      skipPreflight: true,
    };

    const res = await anchor.getProvider().connection.confirmTransaction(airdropTx);

    const [level] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("level")],
      program.programId
    );
    
    const [chestVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("chestVault")],
      program.programId
    );
    const avatarPubkey = anchor.web3.Keypair.generate();

    // TODO: change the owner to the ship
    const [shipPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ship"), player.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods.spawnPlayer(avatarPubkey.publicKey)
    .accounts({
      payer: player.publicKey,
      gameDataAccount: level,
      chestVault: chestVault,
      nftAccount: player.publicKey,
      ship: shipPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Your transaction signature", tx);
  });

  it("Move!", async () => {
    console.log(new Date(), "requesting airdrop");
    let airdropTx = await anchor.getProvider().connection.requestAirdrop(
      player.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    let confirmOptions = {
      skipPreflight: true,
    };

    const res = await anchor.getProvider().connection.confirmTransaction(airdropTx);

    const [level] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("level")],
      program.programId
    );
    
    const [chestVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("chestVault")],
      program.programId
    );

    let [tokenAccountOwnerPda, bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_account_owner_pda", "utf8")],
      program.programId
    );
    
    let mint = new anchor.web3.PublicKey("tokNTPpdBjMeLz1pHRmWgoUJ9sQ1VqxcE431B7adeYv");

    let [token_vault, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault", "utf8"), mint.toBuffer()],
      program.programId
    );
    const [gameActions] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("gameActions")],
      program.programId
    );
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      player,
      mint,
      player.publicKey
    );

    const tx = await program.methods.movePlayerV2(1, 0)
    .accounts({
      player: player.publicKey,
      gameDataAccount: level,
      chestVault: chestVault,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: token_vault,
      playerTokenAccount: playerTokenAccount.address,
      mintOfTokenBeingSent: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      gameActions: gameActions,
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Your transaction signature", tx);
  });

  it("Shoot!", async () => {
    console.log(new Date(), "requesting airdrop");
    let airdropTx = await anchor.getProvider().connection.requestAirdrop(
      player.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );

    let confirmOptions = {
      skipPreflight: true,
    };

    const res = await anchor.getProvider().connection.confirmTransaction(airdropTx);

    const [level] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("level")],
      program.programId
    );
    
    const [chestVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("chestVault")],
      program.programId
    );

    const [gameActions] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("gameActions")],
      program.programId
    );
    let [tokenAccountOwnerPda, bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_account_owner_pda", "utf8")],
      program.programId
    );
    
    let mint = new anchor.web3.PublicKey("tokNTPpdBjMeLz1pHRmWgoUJ9sQ1VqxcE431B7adeYv");

    let [token_vault, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault", "utf8"), mint.toBuffer()],
      program.programId
    );

    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      player,
      mint,
      player.publicKey
    );

    const tx = await program.methods.shoot(0)
    .accounts({
      player: player.publicKey,
      gameDataAccount: level,
      chestVault: chestVault,
      gameActions: gameActions,
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: token_vault,
      playerTokenAccount: playerTokenAccount.address,
      mintOfTokenBeingSent: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Your transaction signature", tx);
  });

  it("Chutuluh!", async () => {
    console.log(new Date(), "requesting airdrop");
    let airdropTx = await anchor.getProvider().connection.requestAirdrop(
      player.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    const res = await anchor.getProvider().connection.confirmTransaction(airdropTx);

    let confirmOptions = {
      skipPreflight: true,
    };

    const [level] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("level")],
      program.programId
    );
    
    const [chestVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("chestVault")],
      program.programId
    );

    const [gameActions] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("gameActions")],
      program.programId
    );

    let [tokenAccountOwnerPda, bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_account_owner_pda", "utf8")],
      program.programId
    );
    
    let [token_vault, bump2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault", "utf8"), mint.toBuffer()],
      program.programId
    );

    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      player,
      mint,
      player.publicKey
    );

    const tx = await program.methods.cthulhu(0)
    .accounts({
      player: player.publicKey,
      gameDataAccount: level,
      chestVault: chestVault,
      gameActions: gameActions,
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: token_vault,
      playerTokenAccount: playerTokenAccount.address,
      mintOfTokenBeingSent: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([player])
    .rpc(confirmOptions);
    console.log("Your transaction signature", tx);
  });
});

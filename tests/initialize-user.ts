import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTodoApp } from "../target/types/solana_todo_app";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("initialize_user", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaTodoApp as Program<SolanaTodoApp>;
  const provider = anchor.getProvider();

  it("Successfully initializes a new user account", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Airdrop SOL to the user for transaction fees
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the user account PDA
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // Call the initialize_user instruction
    const tx = await program.methods
      .initializeUser()
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Initialize user transaction signature:", tx);

    // Fetch the created user account
    const userAccount = await program.account.userAccount.fetch(userAccountPda);

    // Verify the account was initialized correctly
    expect(userAccount.owner.toString()).to.equal(user.publicKey.toString());
    expect(userAccount.todoCount.toNumber()).to.equal(0);
    expect(userAccount.createdAt.toNumber()).to.be.greaterThan(0);
  });

  it("Fails when trying to initialize the same user account twice", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Airdrop SOL to the user for transaction fees
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the user account PDA
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // First initialization should succeed
    await program.methods
      .initializeUser()
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Second initialization should fail
    try {
      await program.methods
        .initializeUser()
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      // If we reach here, the test should fail
      expect.fail("Expected transaction to fail due to duplicate initialization");
    } catch (error) {
      // Verify that the error is due to account already existing
      expect(error.message).to.include("already in use");
    }
  });

  it("Correctly sets user account fields during initialization", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Airdrop SOL to the user for transaction fees
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the user account PDA
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // Record time before initialization
    const beforeTime = Math.floor(Date.now() / 1000);

    // Call the initialize_user instruction
    await program.methods
      .initializeUser()
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Record time after initialization
    const afterTime = Math.floor(Date.now() / 1000);

    // Fetch the created user account
    const userAccount = await program.account.userAccount.fetch(userAccountPda);

    // Verify all fields are set correctly
    expect(userAccount.owner.toString()).to.equal(user.publicKey.toString());
    expect(userAccount.todoCount.toNumber()).to.equal(0);
    
    // Verify timestamp is reasonable (within the test execution window)
    const createdAt = userAccount.createdAt.toNumber();
    expect(createdAt).to.be.at.least(beforeTime);
    expect(createdAt).to.be.at.most(afterTime);
    
    // Verify reserved field is initialized to zeros
    expect(userAccount.reserved).to.deep.equal(new Array(64).fill(0));
  });

  it("Uses correct PDA derivation for user accounts", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Airdrop SOL to the user for transaction fees
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the user account PDA manually
    const [expectedUserAccountPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // Call the initialize_user instruction
    await program.methods
      .initializeUser()
      .accounts({
        user: user.publicKey,
        userAccount: expectedUserAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Verify the account exists at the expected PDA
    const userAccount = await program.account.userAccount.fetch(expectedUserAccountPda);
    expect(userAccount.owner.toString()).to.equal(user.publicKey.toString());

    // Verify that using a different PDA would fail
    const wrongPda = Keypair.generate().publicKey;
    
    try {
      await program.methods
        .initializeUser()
        .accounts({
          user: user.publicKey,
          userAccount: wrongPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      expect.fail("Expected transaction to fail with wrong PDA");
    } catch (error) {
      // This should fail due to seeds constraint violation
      expect(error.message).to.include("seeds constraint");
    }
  });
});
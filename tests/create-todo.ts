import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTodoApp } from "../target/types/solana_todo_app";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("create_todo", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaTodoApp as Program<SolanaTodoApp>;
  const provider = anchor.getProvider();

  // Helper function to initialize a user account
  async function initializeUser(user: Keypair): Promise<PublicKey> {
    // Airdrop SOL to the user for transaction fees
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the user account PDA
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // Initialize the user account
    await program.methods
      .initializeUser()
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    return userAccountPda;
  }

  // Helper function to derive todo account PDA
  function deriveTodoAccountPda(userPublicKey: PublicKey, todoId: number): PublicKey {
    const todoIdBuffer = Buffer.alloc(8);
    todoIdBuffer.writeBigUInt64LE(BigInt(todoId), 0);
    const [todoAccountPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("todo"),
        userPublicKey.toBuffer(),
        todoIdBuffer
      ],
      program.programId
    );
    return todoAccountPda;
  }

  it("Successfully creates a new todo", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Initialize user account
    const userAccountPda = await initializeUser(user);

    // Derive the todo account PDA (ID will be 0 for first todo)
    const todoId = 0;
    const todoAccountPda = deriveTodoAccountPda(user.publicKey, todoId);

    const todoText = "My first todo item";

    // Call the create_todo instruction
    const tx = await program.methods
      .createTodo(todoText)
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        todoAccount: todoAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Create todo transaction signature:", tx);

    // Fetch the created todo account
    const todoAccount = await program.account.todoAccount.fetch(todoAccountPda);

    // Verify the todo was created correctly
    expect(todoAccount.owner.toString()).to.equal(user.publicKey.toString());
    expect(todoAccount.id.toNumber()).to.equal(0);
    expect(todoAccount.text).to.equal(todoText);
    expect(todoAccount.completed).to.be.false;
    expect(todoAccount.createdAt.toNumber()).to.be.greaterThan(0);
    expect(todoAccount.updatedAt.toNumber()).to.be.greaterThan(0);

    // Verify the user account todo count was incremented
    const userAccount = await program.account.userAccount.fetch(userAccountPda);
    expect(userAccount.todoCount.toNumber()).to.equal(1);
  });

  it("Creates multiple todos with sequential IDs", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Initialize user account
    const userAccountPda = await initializeUser(user);

    const todoTexts = ["First todo", "Second todo", "Third todo"];

    for (let i = 0; i < todoTexts.length; i++) {
      // Derive the todo account PDA
      const todoAccountPda = deriveTodoAccountPda(user.publicKey, i);

      // Create the todo
      await program.methods
        .createTodo(todoTexts[i])
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      // Verify the todo was created with correct ID
      const todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.id.toNumber()).to.equal(i);
      expect(todoAccount.text).to.equal(todoTexts[i]);
    }

    // Verify the user account todo count
    const userAccount = await program.account.userAccount.fetch(userAccountPda);
    expect(userAccount.todoCount.toNumber()).to.equal(todoTexts.length);
  });

  it("Fails when todo text is empty", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Initialize user account
    const userAccountPda = await initializeUser(user);

    // Derive the todo account PDA
    const todoId = 0;
    const todoAccountPda = deriveTodoAccountPda(user.publicKey, todoId);

    // Try to create a todo with empty text
    try {
      await program.methods
        .createTodo("")
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      expect.fail("Expected transaction to fail due to empty todo text");
    } catch (error) {
      expect(error.message).to.include("TodoTextEmpty");
    }
  });

  it("Fails when todo text exceeds maximum length", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Initialize user account
    const userAccountPda = await initializeUser(user);

    // Derive the todo account PDA
    const todoId = 0;
    const todoAccountPda = deriveTodoAccountPda(user.publicKey, todoId);

    // Create text that exceeds 280 characters
    const longText = "a".repeat(281);

    // Try to create a todo with text that's too long
    try {
      await program.methods
        .createTodo(longText)
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      expect.fail("Expected transaction to fail due to text being too long");
    } catch (error) {
      expect(error.message).to.include("TodoTextTooLong");
    }
  });

  it("Successfully creates todo with maximum allowed text length", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Initialize user account
    const userAccountPda = await initializeUser(user);

    // Derive the todo account PDA
    const todoId = 0;
    const todoAccountPda = deriveTodoAccountPda(user.publicKey, todoId);

    // Create text with exactly 280 characters (maximum allowed)
    const maxText = "a".repeat(280);

    // Create the todo
    await program.methods
      .createTodo(maxText)
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        todoAccount: todoAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Verify the todo was created successfully
    const todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
    expect(todoAccount.text).to.equal(maxText);
    expect(todoAccount.text.length).to.equal(280);
  });

  it("Fails when user account is not initialized", async () => {
    // Generate a new keypair for the user (but don't initialize)
    const user = Keypair.generate();
    
    // Airdrop SOL to the user for transaction fees
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the user account PDA (but don't create it)
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // Derive the todo account PDA
    const todoId = 0;
    const todoAccountPda = deriveTodoAccountPda(user.publicKey, todoId);

    // Try to create a todo without initializing user account first
    try {
      await program.methods
        .createTodo("Test todo")
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      expect.fail("Expected transaction to fail due to uninitialized user account");
    } catch (error) {
      expect(error.message).to.include("AccountNotInitialized");
    }
  });

  it("Fails when wrong user tries to create todo for another user", async () => {
    // Generate keypairs for two different users
    const user1 = Keypair.generate();
    const user2 = Keypair.generate();
    
    // Initialize user1's account
    const user1AccountPda = await initializeUser(user1);

    // Airdrop SOL to user2 for transaction fees
    await provider.connection.requestAirdrop(user2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive the todo account PDA for user1
    const todoId = 0;
    const todoAccountPda = deriveTodoAccountPda(user1.publicKey, todoId);

    // Try to have user2 create a todo for user1's account
    try {
      await program.methods
        .createTodo("Unauthorized todo")
        .accounts({
          user: user2.publicKey, // user2 is signing
          userAccount: user1AccountPda, // but trying to use user1's account
          todoAccount: todoAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();
      
      expect.fail("Expected transaction to fail due to unauthorized access");
    } catch (error) {
      expect(error.message).to.include("UnauthorizedAccess");
    }
  });

  it("Creates todos with various text formats", async () => {
    // Generate a new keypair for the user
    const user = Keypair.generate();
    
    // Initialize user account
    const userAccountPda = await initializeUser(user);

    const testTexts = [
      "Simple todo",
      "Todo with numbers 123",
      "Todo with special chars !@#$%^&*()",
      "Todo with unicode 🚀 emojis ✅",
      "Todo\nwith\nnewlines",
      "Todo\twith\ttabs",
      "a", // Single character
    ];

    for (let i = 0; i < testTexts.length; i++) {
      // Derive the todo account PDA
      const todoAccountPda = deriveTodoAccountPda(user.publicKey, i);

      // Create the todo
      await program.methods
        .createTodo(testTexts[i])
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      // Verify the todo was created correctly
      const todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.text).to.equal(testTexts[i]);
      expect(todoAccount.id.toNumber()).to.equal(i);
    }

    // Verify the user account todo count
    const userAccount = await program.account.userAccount.fetch(userAccountPda);
    expect(userAccount.todoCount.toNumber()).to.equal(testTexts.length);
  });
});
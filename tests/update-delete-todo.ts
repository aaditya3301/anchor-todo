import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTodoApp } from "../target/types/solana_todo_app";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("update_todo and delete_todo", () => {
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

  // Helper function to create a todo
  async function createTodo(user: Keypair, userAccountPda: PublicKey, todoId: number, text: string): Promise<PublicKey> {
    const todoAccountPda = deriveTodoAccountPda(user.publicKey, todoId);

    await program.methods
      .createTodo(text)
      .accounts({
        user: user.publicKey,
        userAccount: userAccountPda,
        todoAccount: todoAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    return todoAccountPda;
  }

  describe("update_todo", () => {
    it("Successfully updates todo completion status to true", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create a todo
      const todoId = 0;
      const todoAccountPda = await createTodo(user, userAccountPda, todoId, "Test todo");

      // Verify initial state
      let todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.false;
      const initialUpdatedAt = todoAccount.updatedAt.toNumber();

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update todo to completed
      const tx = await program.methods
        .updateTodo(new anchor.BN(todoId), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      console.log("Update todo transaction signature:", tx);

      // Verify the todo was updated
      todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.true;
      expect(todoAccount.updatedAt.toNumber()).to.be.greaterThan(initialUpdatedAt);
      expect(todoAccount.createdAt.toNumber()).to.equal(todoAccount.createdAt.toNumber()); // Should not change
    });

    it("Successfully updates todo completion status to false", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create a todo
      const todoId = 0;
      const todoAccountPda = await createTodo(user, userAccountPda, todoId, "Test todo");

      // First mark it as completed
      await program.methods
        .updateTodo(new anchor.BN(todoId), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify it's completed
      let todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.true;
      const intermediateUpdatedAt = todoAccount.updatedAt.toNumber();

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update todo back to not completed
      await program.methods
        .updateTodo(new anchor.BN(todoId), false)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify the todo was updated back to false
      todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.false;
      expect(todoAccount.updatedAt.toNumber()).to.be.greaterThan(intermediateUpdatedAt);
    });

    it("Fails when wrong user tries to update another user's todo", async () => {
      // Generate keypairs for two different users
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();
      
      // Initialize user1's account and create a todo
      const user1AccountPda = await initializeUser(user1);
      const todoId = 0;
      const todoAccountPda = await createTodo(user1, user1AccountPda, todoId, "User1's todo");

      // Airdrop SOL to user2 for transaction fees
      await provider.connection.requestAirdrop(user2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to have user2 update user1's todo
      try {
        await program.methods
          .updateTodo(new anchor.BN(todoId), true)
          .accounts({
            user: user2.publicKey, // user2 is signing
            todoAccount: todoAccountPda, // but trying to update user1's todo
          })
          .signers([user2])
          .rpc();
        
        expect.fail("Expected transaction to fail due to unauthorized access");
      } catch (error) {
        expect(error.message).to.include("UnauthorizedAccess");
      }
    });

    it("Updates multiple todos independently", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create multiple todos
      const todoTexts = ["First todo", "Second todo", "Third todo"];
      const todoAccountPdas: PublicKey[] = [];

      for (let i = 0; i < todoTexts.length; i++) {
        const todoAccountPda = await createTodo(user, userAccountPda, i, todoTexts[i]);
        todoAccountPdas.push(todoAccountPda);
      }

      // Update only the second todo (index 1)
      await program.methods
        .updateTodo(new anchor.BN(1), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPdas[1],
        })
        .signers([user])
        .rpc();

      // Verify only the second todo was updated
      for (let i = 0; i < todoTexts.length; i++) {
        const todoAccount = await program.account.todoAccount.fetch(todoAccountPdas[i]);
        if (i === 1) {
          expect(todoAccount.completed).to.be.true;
        } else {
          expect(todoAccount.completed).to.be.false;
        }
      }
    });
  });

  describe("delete_todo", () => {
    it("Successfully deletes a todo", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create a todo
      const todoId = 0;
      const todoAccountPda = await createTodo(user, userAccountPda, todoId, "Todo to delete");

      // Verify todo exists and user count is 1
      let todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.text).to.equal("Todo to delete");
      
      let userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(1);

      // Delete the todo
      const tx = await program.methods
        .deleteTodo(new anchor.BN(todoId))
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      console.log("Delete todo transaction signature:", tx);

      // Verify the todo account no longer exists
      try {
        await program.account.todoAccount.fetch(todoAccountPda);
        expect.fail("Expected todo account to be deleted");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      // Verify user todo count was decremented
      userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(0);
    });

    it("Successfully deletes multiple todos", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create multiple todos
      const todoTexts = ["First todo", "Second todo", "Third todo"];
      const todoAccountPdas: PublicKey[] = [];

      for (let i = 0; i < todoTexts.length; i++) {
        const todoAccountPda = await createTodo(user, userAccountPda, i, todoTexts[i]);
        todoAccountPdas.push(todoAccountPda);
      }

      // Verify initial state
      let userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(3);

      // Delete the second todo (index 1)
      await program.methods
        .deleteTodo(new anchor.BN(1))
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPdas[1],
        })
        .signers([user])
        .rpc();

      // Verify the second todo is deleted and count is decremented
      try {
        await program.account.todoAccount.fetch(todoAccountPdas[1]);
        expect.fail("Expected todo account to be deleted");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(2);

      // Verify other todos still exist
      const firstTodo = await program.account.todoAccount.fetch(todoAccountPdas[0]);
      expect(firstTodo.text).to.equal("First todo");

      const thirdTodo = await program.account.todoAccount.fetch(todoAccountPdas[2]);
      expect(thirdTodo.text).to.equal("Third todo");
    });

    it("Fails when wrong user tries to delete another user's todo", async () => {
      // Generate keypairs for two different users
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();
      
      // Initialize user1's account and create a todo
      const user1AccountPda = await initializeUser(user1);
      const todoId = 0;
      const todoAccountPda = await createTodo(user1, user1AccountPda, todoId, "User1's todo");

      // Initialize user2's account
      const user2AccountPda = await initializeUser(user2);

      // Try to have user2 delete user1's todo
      try {
        await program.methods
          .deleteTodo(new anchor.BN(todoId))
          .accounts({
            user: user2.publicKey, // user2 is signing
            userAccount: user2AccountPda, // user2's account
            todoAccount: todoAccountPda, // but trying to delete user1's todo
          })
          .signers([user2])
          .rpc();
        
        expect.fail("Expected transaction to fail due to unauthorized access");
      } catch (error) {
        expect(error.message).to.include("UnauthorizedAccess");
      }

      // Verify user1's todo still exists
      const todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.text).to.equal("User1's todo");
    });

    it("Fails when trying to delete non-existent todo", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Try to delete a todo that doesn't exist
      const nonExistentTodoId = 999;
      const nonExistentTodoAccountPda = deriveTodoAccountPda(user.publicKey, nonExistentTodoId);

      try {
        await program.methods
          .deleteTodo(new anchor.BN(nonExistentTodoId))
          .accounts({
            user: user.publicKey,
            userAccount: userAccountPda,
            todoAccount: nonExistentTodoAccountPda,
          })
          .signers([user])
          .rpc();
        
        expect.fail("Expected transaction to fail due to non-existent todo");
      } catch (error) {
        expect(error.message).to.include("AccountNotInitialized");
      }
    });

    it("Deletes completed todo successfully", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create and complete a todo
      const todoId = 0;
      const todoAccountPda = await createTodo(user, userAccountPda, todoId, "Completed todo");

      // Mark todo as completed
      await program.methods
        .updateTodo(new anchor.BN(todoId), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify todo is completed
      let todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.true;

      // Delete the completed todo
      await program.methods
        .deleteTodo(new anchor.BN(todoId))
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify the todo account no longer exists
      try {
        await program.account.todoAccount.fetch(todoAccountPda);
        expect.fail("Expected todo account to be deleted");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      // Verify user todo count was decremented
      const userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(0);
    });
  });

  describe("Combined update and delete operations", () => {
    it("Updates and then deletes a todo", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create a todo
      const todoId = 0;
      const todoAccountPda = await createTodo(user, userAccountPda, todoId, "Todo for update and delete");

      // Update todo to completed
      await program.methods
        .updateTodo(new anchor.BN(todoId), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify todo is completed
      let todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.true;

      // Update todo back to not completed
      await program.methods
        .updateTodo(new anchor.BN(todoId), false)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify todo is not completed
      todoAccount = await program.account.todoAccount.fetch(todoAccountPda);
      expect(todoAccount.completed).to.be.false;

      // Delete the todo
      await program.methods
        .deleteTodo(new anchor.BN(todoId))
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPda,
        })
        .signers([user])
        .rpc();

      // Verify the todo account no longer exists
      try {
        await program.account.todoAccount.fetch(todoAccountPda);
        expect.fail("Expected todo account to be deleted");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      // Verify user todo count was decremented
      const userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(0);
    });

    it("Manages multiple todos with mixed operations", async () => {
      // Generate a new keypair for the user
      const user = Keypair.generate();
      
      // Initialize user account
      const userAccountPda = await initializeUser(user);

      // Create multiple todos
      const todoTexts = ["Todo 1", "Todo 2", "Todo 3", "Todo 4"];
      const todoAccountPdas: PublicKey[] = [];

      for (let i = 0; i < todoTexts.length; i++) {
        const todoAccountPda = await createTodo(user, userAccountPda, i, todoTexts[i]);
        todoAccountPdas.push(todoAccountPda);
      }

      // Verify initial state
      let userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(4);

      // Update todos 0 and 2 to completed
      await program.methods
        .updateTodo(new anchor.BN(0), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPdas[0],
        })
        .signers([user])
        .rpc();

      await program.methods
        .updateTodo(new anchor.BN(2), true)
        .accounts({
          user: user.publicKey,
          todoAccount: todoAccountPdas[2],
        })
        .signers([user])
        .rpc();

      // Delete todo 1
      await program.methods
        .deleteTodo(new anchor.BN(1))
        .accounts({
          user: user.publicKey,
          userAccount: userAccountPda,
          todoAccount: todoAccountPdas[1],
        })
        .signers([user])
        .rpc();

      // Verify final state
      userAccount = await program.account.userAccount.fetch(userAccountPda);
      expect(userAccount.todoCount.toNumber()).to.equal(3);

      // Verify todo 0 is completed
      const todo0 = await program.account.todoAccount.fetch(todoAccountPdas[0]);
      expect(todo0.completed).to.be.true;

      // Verify todo 1 is deleted
      try {
        await program.account.todoAccount.fetch(todoAccountPdas[1]);
        expect.fail("Expected todo 1 to be deleted");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }

      // Verify todo 2 is completed
      const todo2 = await program.account.todoAccount.fetch(todoAccountPdas[2]);
      expect(todo2.completed).to.be.true;

      // Verify todo 3 is not completed
      const todo3 = await program.account.todoAccount.fetch(todoAccountPdas[3]);
      expect(todo3.completed).to.be.false;
    });
  });
});
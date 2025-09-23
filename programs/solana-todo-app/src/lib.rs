use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod tests;

#[program]
pub mod solana_todo_app {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    /// Initialize a new user account for todo management
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;
        
        // Initialize the user account with the signer as owner
        user_account.initialize(ctx.accounts.user.key(), &clock)?;
        
        msg!("User account initialized for: {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Create a new todo item for the user
    pub fn create_todo(ctx: Context<CreateTodo>, text: String) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let todo_account = &mut ctx.accounts.todo_account;
        let clock = Clock::get()?;
        
        // Validate that the user is the owner of the user account
        user_account.validate_owner(&ctx.accounts.user.key())?;
        
        // Generate the next todo ID by incrementing the user's todo count
        let todo_id = user_account.todo_count;
        
        // Initialize the todo account with the provided text
        todo_account.initialize(
            ctx.accounts.user.key(),
            todo_id,
            text.clone(),
            &clock,
        )?;
        
        // Increment the user's todo count
        user_account.increment_todo_count()?;
        
        msg!(
            "Todo created - ID: {}, Text: '{}', Owner: {}",
            todo_id,
            text,
            ctx.accounts.user.key()
        );
        
        Ok(())
    }

    /// Update a todo's completion status
    pub fn update_todo(ctx: Context<UpdateTodo>, todo_id: u64, completed: bool) -> Result<()> {
        let todo_account = &mut ctx.accounts.todo_account;
        let clock = Clock::get()?;
        
        // Validate that the user is the owner of the todo
        todo_account.validate_owner(&ctx.accounts.user.key())?;
        
        // Update the completion status
        todo_account.update_completion(completed, &clock)?;
        
        msg!(
            "Todo updated - ID: {}, Completed: {}, Owner: {}",
            todo_account.id,
            completed,
            ctx.accounts.user.key()
        );
        
        Ok(())
    }

    /// Delete a todo item
    pub fn delete_todo(ctx: Context<DeleteTodo>, todo_id: u64) -> Result<()> {
        let todo_account = &ctx.accounts.todo_account;
        let user_account = &mut ctx.accounts.user_account;
        
        // Validate that the user is the owner of both accounts
        todo_account.validate_owner(&ctx.accounts.user.key())?;
        user_account.validate_owner(&ctx.accounts.user.key())?;
        
        // Decrement the user's todo count
        user_account.decrement_todo_count()?;
        
        msg!(
            "Todo deleted - ID: {}, Owner: {}",
            todo_account.id,
            ctx.accounts.user.key()
        );
        
        // The todo account will be automatically closed and rent returned to the user
        // due to the close constraint in the DeleteTodo context
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    /// The user who is initializing their account
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// The user account to be created
    #[account(
        init,
        payer = user,
        space = UserAccount::LEN,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTodo<'info> {
    /// The user creating the todo
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// The user's account that tracks their todos
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump,
        constraint = user_account.owner == user.key() @ TodoError::UnauthorizedAccess
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// The todo account to be created
    #[account(
        init,
        payer = user,
        space = TodoAccount::LEN,
        seeds = [b"todo", user.key().as_ref(), &user_account.todo_count.to_le_bytes()],
        bump
    )]
    pub todo_account: Account<'info, TodoAccount>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(todo_id: u64)]
pub struct UpdateTodo<'info> {
    /// The user updating the todo
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// The todo account to be updated
    #[account(
        mut,
        seeds = [b"todo", user.key().as_ref(), &todo_id.to_le_bytes()],
        bump,
        constraint = todo_account.owner == user.key() @ TodoError::UnauthorizedAccess
    )]
    pub todo_account: Account<'info, TodoAccount>,
}

#[derive(Accounts)]
#[instruction(todo_id: u64)]
pub struct DeleteTodo<'info> {
    /// The user deleting the todo
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// The user's account that tracks their todos
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump,
        constraint = user_account.owner == user.key() @ TodoError::UnauthorizedAccess
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// The todo account to be deleted
    #[account(
        mut,
        close = user,
        seeds = [b"todo", user.key().as_ref(), &todo_id.to_le_bytes()],
        bump,
        constraint = todo_account.owner == user.key() @ TodoError::UnauthorizedAccess
    )]
    pub todo_account: Account<'info, TodoAccount>,
}

// Custom error codes for the todo app
#[error_code]
pub enum TodoError {
    #[msg("Todo text exceeds maximum length of 280 characters")]
    TodoTextTooLong,
    #[msg("Todo text cannot be empty")]
    TodoTextEmpty,
    #[msg("Unauthorized access to todo item")]
    UnauthorizedAccess,
    #[msg("Todo not found")]
    TodoNotFound,
    #[msg("User account already initialized")]
    UserAlreadyInitialized,
}

// User account that manages todo lists and permissions
#[account]
pub struct UserAccount {
    /// The owner/authority of this user account
    pub owner: Pubkey,
    /// Total number of todos created by this user
    pub todo_count: u64,
    /// Timestamp when the user account was created
    pub created_at: i64,
    /// Reserved space for future upgrades (64 bytes)
    pub reserved: [u8; 64],
}

impl UserAccount {
    /// Calculate the space required for UserAccount
    /// 8 (discriminator) + 32 (owner) + 8 (todo_count) + 8 (created_at) + 64 (reserved) = 120 bytes
    pub const LEN: usize = 8 + 32 + 8 + 8 + 64;

    /// Initialize a new user account
    pub fn initialize(&mut self, owner: Pubkey, clock: &Clock) -> Result<()> {
        self.owner = owner;
        self.todo_count = 0;
        self.created_at = clock.unix_timestamp;
        self.reserved = [0; 64];
        Ok(())
    }

    /// Increment the todo count
    pub fn increment_todo_count(&mut self) -> Result<()> {
        self.todo_count = self.todo_count.checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    /// Decrement the todo count
    pub fn decrement_todo_count(&mut self) -> Result<()> {
        self.todo_count = self.todo_count.checked_sub(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    /// Validate that the given pubkey is the owner of this account
    pub fn validate_owner(&self, owner: &Pubkey) -> Result<()> {
        require_keys_eq!(self.owner, *owner, TodoError::UnauthorizedAccess);
        Ok(())
    }
}

// Individual todo item account
#[account]
pub struct TodoAccount {
    /// The owner/authority of this todo item
    pub owner: Pubkey,
    /// Unique identifier for this todo within the user's list
    pub id: u64,
    /// The todo text content (max 280 characters)
    pub text: String,
    /// Whether the todo is completed
    pub completed: bool,
    /// Timestamp when the todo was created
    pub created_at: i64,
    /// Timestamp when the todo was last updated
    pub updated_at: i64,
    /// Reserved space for future upgrades (32 bytes)
    pub reserved: [u8; 32],
}

impl TodoAccount {
    /// Maximum length for todo text
    pub const MAX_TEXT_LENGTH: usize = 280;
    
    /// Calculate the space required for TodoAccount
    /// 8 (discriminator) + 32 (owner) + 8 (id) + 4 + 280 (text) + 1 (completed) + 8 (created_at) + 8 (updated_at) + 32 (reserved) = 381 bytes
    pub const LEN: usize = 8 + 32 + 8 + 4 + Self::MAX_TEXT_LENGTH + 1 + 8 + 8 + 32;

    /// Initialize a new todo account
    pub fn initialize(
        &mut self,
        owner: Pubkey,
        id: u64,
        text: String,
        clock: &Clock,
    ) -> Result<()> {
        // Validate todo text
        Self::validate_text(&text)?;
        
        self.owner = owner;
        self.id = id;
        self.text = text;
        self.completed = false;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.reserved = [0; 32];
        
        Ok(())
    }

    /// Update the todo text
    pub fn update_text(&mut self, new_text: String, clock: &Clock) -> Result<()> {
        Self::validate_text(&new_text)?;
        self.text = new_text;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Update the completion status
    pub fn update_completion(&mut self, completed: bool, clock: &Clock) -> Result<()> {
        self.completed = completed;
        self.updated_at = clock.unix_timestamp;
        Ok(())
    }

    /// Validate that the given pubkey is the owner of this todo
    pub fn validate_owner(&self, owner: &Pubkey) -> Result<()> {
        require_keys_eq!(self.owner, *owner, TodoError::UnauthorizedAccess);
        Ok(())
    }

    /// Validate todo text constraints
    pub fn validate_text(text: &str) -> Result<()> {
        require!(!text.is_empty(), TodoError::TodoTextEmpty);
        require!(
            text.len() <= Self::MAX_TEXT_LENGTH,
            TodoError::TodoTextTooLong
        );
        Ok(())
    }

    /// Check if the todo is completed
    pub fn is_completed(&self) -> bool {
        self.completed
    }

    /// Get the age of the todo in seconds
    pub fn get_age(&self, current_time: i64) -> i64 {
        current_time - self.created_at
    }
}
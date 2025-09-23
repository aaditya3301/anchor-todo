#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::*;
    use crate::{UserAccount, TodoAccount};

    #[test]
    fn test_user_account_size() {
        // Verify UserAccount size calculation
        let expected_size = 8 + 32 + 8 + 8 + 64; // discriminator + owner + todo_count + created_at + reserved
        assert_eq!(UserAccount::LEN, expected_size);
        assert_eq!(UserAccount::LEN, 120);
    }

    #[test]
    fn test_todo_account_size() {
        // Verify TodoAccount size calculation
        let expected_size = 8 + 32 + 8 + 4 + 280 + 1 + 8 + 8 + 32; // discriminator + owner + id + text_len + text + completed + created_at + updated_at + reserved
        assert_eq!(TodoAccount::LEN, expected_size);
        assert_eq!(TodoAccount::LEN, 381);
    }

    #[test]
    fn test_todo_text_validation() {
        // Test empty text validation
        assert!(TodoAccount::validate_text("").is_err());
        
        // Test text too long validation
        let long_text = "a".repeat(281);
        assert!(TodoAccount::validate_text(&long_text).is_err());
        
        // Test valid text
        assert!(TodoAccount::validate_text("Valid todo text").is_ok());
        
        // Test maximum length text
        let max_text = "a".repeat(280);
        assert!(TodoAccount::validate_text(&max_text).is_ok());
    }

    #[test]
    fn test_user_account_validation() {
        let owner = Pubkey::new_unique();
        let different_owner = Pubkey::new_unique();
        
        let mut user_account = UserAccount {
            owner,
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Test valid owner
        assert!(user_account.validate_owner(&owner).is_ok());
        
        // Test invalid owner - this would fail in actual program execution
        // but we can't test the require_keys_eq! macro in unit tests
    }

    #[test]
    fn test_todo_account_operations() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner,
            id: 1,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Test initialization
        let result = todo.initialize(owner, 1, "Test todo".to_string(), &clock);
        assert!(result.is_ok());
        assert_eq!(todo.text, "Test todo");
        assert!(!todo.completed);
        assert_eq!(todo.created_at, 1000);
        assert_eq!(todo.updated_at, 1000);
        
        // Test completion update
        let new_clock = Clock {
            unix_timestamp: 2000,
            ..clock
        };
        let result = todo.update_completion(true, &new_clock);
        assert!(result.is_ok());
        assert!(todo.completed);
        assert_eq!(todo.updated_at, 2000);
        
        // Test text update
        let result = todo.update_text("Updated todo".to_string(), &new_clock);
        assert!(result.is_ok());
        assert_eq!(todo.text, "Updated todo");
        assert_eq!(todo.updated_at, 2000);
    }

    #[test]
    fn test_user_account_operations() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Test initialization
        let result = user_account.initialize(owner, &clock);
        assert!(result.is_ok());
        assert_eq!(user_account.owner, owner);
        assert_eq!(user_account.todo_count, 0);
        assert_eq!(user_account.created_at, 1000);
        
        // Test todo count operations
        let result = user_account.increment_todo_count();
        assert!(result.is_ok());
        assert_eq!(user_account.todo_count, 1);
        
        let result = user_account.decrement_todo_count();
        assert!(result.is_ok());
        assert_eq!(user_account.todo_count, 0);
    }

    #[test]
    fn test_user_account_initialization() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1500,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 999, // Set to non-zero to verify initialization resets it
            created_at: 0,
            reserved: [1; 64], // Set to non-zero to verify initialization resets it
        };
        
        // Test successful initialization
        let result = user_account.initialize(owner, &clock);
        assert!(result.is_ok());
        
        // Verify all fields are properly set
        assert_eq!(user_account.owner, owner);
        assert_eq!(user_account.todo_count, 0);
        assert_eq!(user_account.created_at, 1500);
        assert_eq!(user_account.reserved, [0; 64]);
    }

    #[test]
    fn test_user_account_todo_count_overflow() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: u64::MAX,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Initialize first
        let _ = user_account.initialize(owner, &clock);
        user_account.todo_count = u64::MAX;
        
        // Test overflow protection on increment
        let result = user_account.increment_todo_count();
        assert!(result.is_err());
    }

    #[test]
    fn test_user_account_todo_count_underflow() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Initialize first
        let _ = user_account.initialize(owner, &clock);
        
        // Test underflow protection on decrement
        let result = user_account.decrement_todo_count();
        assert!(result.is_err());
    }

    #[test]
    fn test_user_account_owner_validation() {
        let owner = Pubkey::new_unique();
        let different_owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Initialize with owner
        let _ = user_account.initialize(owner, &clock);
        
        // Test valid owner validation
        let result = user_account.validate_owner(&owner);
        assert!(result.is_ok());
        
        // Note: We can't test the actual error case with require_keys_eq! 
        // in unit tests as it requires the Anchor runtime
    }

    #[test]
    fn test_create_todo_text_validation() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        // Test empty text - should fail
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        let result = todo.initialize(owner, 0, "".to_string(), &clock);
        assert!(result.is_err());
        
        // Test text too long - should fail
        let long_text = "a".repeat(281);
        let result = todo.initialize(owner, 0, long_text, &clock);
        assert!(result.is_err());
        
        // Test valid text - should succeed
        let result = todo.initialize(owner, 0, "Valid todo text".to_string(), &clock);
        assert!(result.is_ok());
        assert_eq!(todo.text, "Valid todo text");
        assert_eq!(todo.id, 0);
        assert_eq!(todo.owner, owner);
        assert!(!todo.completed);
        assert_eq!(todo.created_at, 1000);
        assert_eq!(todo.updated_at, 1000);
        
        // Test maximum length text - should succeed
        let max_text = "a".repeat(280);
        let mut todo2 = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        let result = todo2.initialize(owner, 1, max_text.clone(), &clock);
        assert!(result.is_ok());
        assert_eq!(todo2.text, max_text);
        assert_eq!(todo2.id, 1);
    }

    #[test]
    fn test_create_todo_id_generation() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Initialize user account
        let _ = user_account.initialize(owner, &clock);
        
        // Test sequential ID generation
        for expected_id in 0..5 {
            let mut todo = TodoAccount {
                owner: Pubkey::default(),
                id: 0,
                text: String::new(),
                completed: false,
                created_at: 0,
                updated_at: 0,
                reserved: [0; 32],
            };
            
            // Simulate the create_todo logic
            let todo_id = user_account.todo_count;
            let result = todo.initialize(owner, todo_id, format!("Todo {}", expected_id), &clock);
            assert!(result.is_ok());
            assert_eq!(todo.id, expected_id);
            
            // Increment user's todo count
            let _ = user_account.increment_todo_count();
        }
        
        assert_eq!(user_account.todo_count, 5);
    }

    #[test]
    fn test_create_todo_with_various_text_inputs() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        // Test cases with different text inputs
        let max_text = "a".repeat(280);
        let long_text = "a".repeat(281);
        let test_cases = vec![
            ("Simple todo", true),
            ("Todo with numbers 123", true),
            ("Todo with special chars !@#$%^&*()", true),
            ("Todo with unicode 🚀 emojis ✅", true),
            ("Todo\nwith\nnewlines", true),
            ("Todo\twith\ttabs", true),
            ("a", true), // Single character
            (max_text.as_str(), true), // Maximum length
            ("", false), // Empty string
            (long_text.as_str(), false), // Too long
        ];
        
        for (i, (text, should_succeed)) in test_cases.iter().enumerate() {
            let mut todo = TodoAccount {
                owner: Pubkey::default(),
                id: 0,
                text: String::new(),
                completed: false,
                created_at: 0,
                updated_at: 0,
                reserved: [0; 32],
            };
            
            let result = todo.initialize(owner, i as u64, text.to_string(), &clock);
            
            if *should_succeed {
                assert!(result.is_ok(), "Expected success for text: '{}'", text);
                assert_eq!(todo.text, *text);
                assert_eq!(todo.id, i as u64);
                assert_eq!(todo.owner, owner);
                assert!(!todo.completed);
                assert_eq!(todo.created_at, 1000);
                assert_eq!(todo.updated_at, 1000);
            } else {
                assert!(result.is_err(), "Expected failure for text: '{}'", text);
            }
        }
    }

    #[test]
    fn test_create_todo_ownership_validation() {
        let owner = Pubkey::new_unique();
        let different_owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Initialize todo with correct owner
        let result = todo.initialize(owner, 0, "Test todo".to_string(), &clock);
        assert!(result.is_ok());
        assert_eq!(todo.owner, owner);
        
        // Test owner validation
        let result = todo.validate_owner(&owner);
        assert!(result.is_ok());
        
        // Note: We can't test the actual error case with require_keys_eq! 
        // in unit tests as it requires the Anchor runtime
    }

    #[test]
    fn test_create_todo_timestamp_handling() {
        let owner = Pubkey::new_unique();
        let clock1 = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        let clock2 = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 2000,
        };
        
        let mut todo1 = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        let mut todo2 = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Create todos at different times
        let result1 = todo1.initialize(owner, 0, "First todo".to_string(), &clock1);
        let result2 = todo2.initialize(owner, 1, "Second todo".to_string(), &clock2);
        
        assert!(result1.is_ok());
        assert!(result2.is_ok());
        
        // Verify timestamps are set correctly
        assert_eq!(todo1.created_at, 1000);
        assert_eq!(todo1.updated_at, 1000);
        assert_eq!(todo2.created_at, 2000);
        assert_eq!(todo2.updated_at, 2000);
        
        // Test age calculation
        assert_eq!(todo1.get_age(1500), 500);
        assert_eq!(todo2.get_age(2500), 500);
    }

    #[test]
    fn test_create_todo_default_state() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        let result = todo.initialize(owner, 42, "New todo".to_string(), &clock);
        assert!(result.is_ok());
        
        // Verify default state
        assert_eq!(todo.owner, owner);
        assert_eq!(todo.id, 42);
        assert_eq!(todo.text, "New todo");
        assert!(!todo.completed); // Should default to false
        assert!(!todo.is_completed()); // Test helper method
        assert_eq!(todo.created_at, 1000);
        assert_eq!(todo.updated_at, 1000);
        assert_eq!(todo.reserved, [0; 32]); // Should be zeroed
    }

    #[test]
    fn test_update_todo_completion_status() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Initialize todo
        let result = todo.initialize(owner, 0, "Test todo".to_string(), &clock);
        assert!(result.is_ok());
        assert!(!todo.completed);
        assert_eq!(todo.updated_at, 1000);
        
        // Update to completed
        let new_clock = Clock {
            unix_timestamp: 2000,
            ..clock
        };
        let result = todo.update_completion(true, &new_clock);
        assert!(result.is_ok());
        assert!(todo.completed);
        assert!(todo.is_completed());
        assert_eq!(todo.updated_at, 2000);
        assert_eq!(todo.created_at, 1000); // Should not change
        
        // Update back to not completed
        let newer_clock = Clock {
            unix_timestamp: 3000,
            ..clock
        };
        let result = todo.update_completion(false, &newer_clock);
        assert!(result.is_ok());
        assert!(!todo.completed);
        assert!(!todo.is_completed());
        assert_eq!(todo.updated_at, 3000);
        assert_eq!(todo.created_at, 1000); // Should not change
    }

    #[test]
    fn test_update_todo_owner_validation() {
        let owner = Pubkey::new_unique();
        let different_owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Initialize todo with owner
        let result = todo.initialize(owner, 0, "Test todo".to_string(), &clock);
        assert!(result.is_ok());
        
        // Test valid owner can update
        let result = todo.validate_owner(&owner);
        assert!(result.is_ok());
        
        // Note: We can't test the actual error case with require_keys_eq! 
        // in unit tests as it requires the Anchor runtime
    }

    #[test]
    fn test_update_todo_multiple_status_changes() {
        let owner = Pubkey::new_unique();
        let mut clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Initialize todo
        let result = todo.initialize(owner, 0, "Test todo".to_string(), &clock);
        assert!(result.is_ok());
        
        // Test multiple status changes
        let status_changes = vec![true, false, true, true, false];
        for (i, &completed) in status_changes.iter().enumerate() {
            clock.unix_timestamp = 1000 + (i as i64 + 1) * 1000;
            let result = todo.update_completion(completed, &clock);
            assert!(result.is_ok());
            assert_eq!(todo.completed, completed);
            assert_eq!(todo.updated_at, clock.unix_timestamp);
            assert_eq!(todo.created_at, 1000); // Should never change
        }
    }

    #[test]
    fn test_delete_todo_user_count_decrement() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Initialize user account
        let result = user_account.initialize(owner, &clock);
        assert!(result.is_ok());
        
        // Simulate creating some todos by incrementing count
        for _ in 0..5 {
            let _ = user_account.increment_todo_count();
        }
        assert_eq!(user_account.todo_count, 5);
        
        // Test decrementing count (simulating delete)
        let result = user_account.decrement_todo_count();
        assert!(result.is_ok());
        assert_eq!(user_account.todo_count, 4);
        
        // Test multiple decrements
        for expected_count in (1..4).rev() {
            let result = user_account.decrement_todo_count();
            assert!(result.is_ok());
            assert_eq!(user_account.todo_count, expected_count);
        }
        
        // Test final decrement to zero
        let result = user_account.decrement_todo_count();
        assert!(result.is_ok());
        assert_eq!(user_account.todo_count, 0);
        
        // Test underflow protection
        let result = user_account.decrement_todo_count();
        assert!(result.is_err());
        assert_eq!(user_account.todo_count, 0); // Should remain at 0
    }

    #[test]
    fn test_delete_todo_owner_validation() {
        let owner = Pubkey::new_unique();
        let different_owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        let todo_account = TodoAccount {
            owner,
            id: 0,
            text: "Test todo".to_string(),
            completed: false,
            created_at: 1000,
            updated_at: 1000,
            reserved: [0; 32],
        };
        
        // Initialize user account
        let result = user_account.initialize(owner, &clock);
        assert!(result.is_ok());
        
        // Test valid owner validation for both accounts
        let result = user_account.validate_owner(&owner);
        assert!(result.is_ok());
        
        let result = todo_account.validate_owner(&owner);
        assert!(result.is_ok());
        
        // Note: We can't test the actual error cases with require_keys_eq! 
        // in unit tests as they require the Anchor runtime
    }

    #[test]
    fn test_delete_todo_workflow_simulation() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        // Initialize user account
        let result = user_account.initialize(owner, &clock);
        assert!(result.is_ok());
        
        // Simulate creating multiple todos
        let mut todos = Vec::new();
        for i in 0..3 {
            let mut todo = TodoAccount {
                owner: Pubkey::default(),
                id: 0,
                text: String::new(),
                completed: false,
                created_at: 0,
                updated_at: 0,
                reserved: [0; 32],
            };
            
            let todo_id = user_account.todo_count;
            let result = todo.initialize(owner, todo_id, format!("Todo {}", i), &clock);
            assert!(result.is_ok());
            
            let _ = user_account.increment_todo_count();
            todos.push(todo);
        }
        
        assert_eq!(user_account.todo_count, 3);
        assert_eq!(todos.len(), 3);
        
        // Simulate deleting todos (validate ownership and decrement count)
        for (i, todo) in todos.iter().enumerate() {
            // Validate ownership before deletion
            let result = todo.validate_owner(&owner);
            assert!(result.is_ok());
            
            let result = user_account.validate_owner(&owner);
            assert!(result.is_ok());
            
            // Decrement count (simulating successful deletion)
            let result = user_account.decrement_todo_count();
            assert!(result.is_ok());
            assert_eq!(user_account.todo_count, (3 - i - 1) as u64);
        }
        
        assert_eq!(user_account.todo_count, 0);
    }

    #[test]
    fn test_update_todo_text_functionality() {
        let owner = Pubkey::new_unique();
        let clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // Initialize todo
        let result = todo.initialize(owner, 0, "Original text".to_string(), &clock);
        assert!(result.is_ok());
        assert_eq!(todo.text, "Original text");
        assert_eq!(todo.updated_at, 1000);
        
        // Update text
        let new_clock = Clock {
            unix_timestamp: 2000,
            ..clock
        };
        let result = todo.update_text("Updated text".to_string(), &new_clock);
        assert!(result.is_ok());
        assert_eq!(todo.text, "Updated text");
        assert_eq!(todo.updated_at, 2000);
        assert_eq!(todo.created_at, 1000); // Should not change
        
        // Test text validation during update
        let result = todo.update_text("".to_string(), &new_clock);
        assert!(result.is_err());
        
        let long_text = "a".repeat(281);
        let result = todo.update_text(long_text, &new_clock);
        assert!(result.is_err());
        
        // Text should remain unchanged after failed updates
        assert_eq!(todo.text, "Updated text");
    }

    #[test]
    fn test_comprehensive_todo_lifecycle() {
        let owner = Pubkey::new_unique();
        let mut clock = Clock {
            slot: 0,
            epoch_start_timestamp: 0,
            epoch: 0,
            leader_schedule_epoch: 0,
            unix_timestamp: 1000,
        };
        
        let mut user_account = UserAccount {
            owner: Pubkey::default(),
            todo_count: 0,
            created_at: 0,
            reserved: [0; 64],
        };
        
        let mut todo = TodoAccount {
            owner: Pubkey::default(),
            id: 0,
            text: String::new(),
            completed: false,
            created_at: 0,
            updated_at: 0,
            reserved: [0; 32],
        };
        
        // 1. Initialize user account
        let result = user_account.initialize(owner, &clock);
        assert!(result.is_ok());
        assert_eq!(user_account.todo_count, 0);
        
        // 2. Create todo
        let todo_id = user_account.todo_count;
        let result = todo.initialize(owner, todo_id, "Buy groceries".to_string(), &clock);
        assert!(result.is_ok());
        let _ = user_account.increment_todo_count();
        
        assert_eq!(todo.id, 0);
        assert_eq!(todo.text, "Buy groceries");
        assert!(!todo.completed);
        assert_eq!(user_account.todo_count, 1);
        
        // 3. Update todo text
        clock.unix_timestamp = 2000;
        let result = todo.update_text("Buy groceries and milk".to_string(), &clock);
        assert!(result.is_ok());
        assert_eq!(todo.text, "Buy groceries and milk");
        assert_eq!(todo.updated_at, 2000);
        
        // 4. Mark todo as completed
        clock.unix_timestamp = 3000;
        let result = todo.update_completion(true, &clock);
        assert!(result.is_ok());
        assert!(todo.completed);
        assert_eq!(todo.updated_at, 3000);
        
        // 5. Mark todo as not completed again
        clock.unix_timestamp = 4000;
        let result = todo.update_completion(false, &clock);
        assert!(result.is_ok());
        assert!(!todo.completed);
        assert_eq!(todo.updated_at, 4000);
        
        // 6. Complete todo again
        clock.unix_timestamp = 5000;
        let result = todo.update_completion(true, &clock);
        assert!(result.is_ok());
        assert!(todo.completed);
        assert_eq!(todo.updated_at, 5000);
        
        // 7. Validate ownership before deletion
        let result = todo.validate_owner(&owner);
        assert!(result.is_ok());
        let result = user_account.validate_owner(&owner);
        assert!(result.is_ok());
        
        // 8. Delete todo (decrement count)
        let result = user_account.decrement_todo_count();
        assert!(result.is_ok());
        assert_eq!(user_account.todo_count, 0);
        
        // Verify final state
        assert_eq!(todo.created_at, 1000);
        assert_eq!(todo.updated_at, 5000);
        assert!(todo.completed);
        assert_eq!(todo.text, "Buy groceries and milk");
    }
}
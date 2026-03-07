use serde::{Deserialize, Serialize};
use std::fmt;

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub field_one: String,
    #[serde(default = "default_ttl_seconds")]
    pub ttl_seconds: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            field_one: String::new(),
            ttl_seconds: default_ttl_seconds(),
        }
    }
}

const fn default_ttl_seconds() -> u64 {
    3600
}

// -----------------------------------------------------------------------------
// Domain Types
// -----------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub payload: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl Item {
    #[must_use]
    pub fn new(payload: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            payload: payload.into(),
            created_at: chrono::Utc::now(),
        }
    }
}

impl fmt::Display for Item {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Item({})", self.id)
    }
}

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

pub struct CreateInput {
    pub payload: String,
}

pub struct UpdateInput {
    pub payload: Option<String>,
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("item not found: {0}")]
    NotFound(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("internal error: {0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, Error>;

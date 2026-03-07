use crate::types::{Config, CreateInput, Error, Item, Result, UpdateInput};

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

pub struct FeatureService {
    config: Config,
}

impl FeatureService {
    #[must_use]
    pub const fn new(config: Config) -> Self {
        Self { config }
    }

    pub fn create_item(&self, input: CreateInput) -> Result<Item> {
        self.validate_payload(&input.payload)?;
        Ok(Item::new(input.payload))
    }

    pub fn get_item(&self, id: &str) -> Result<Item> {
        Err(Error::NotFound(id.to_string()))
    }

    pub fn update_item(&self, id: &str, input: UpdateInput) -> Result<Item> {
        if let Some(ref payload) = input.payload {
            self.validate_payload(payload)?;
        }

        let mut item = self.get_item(id)?;
        if let Some(payload) = input.payload {
            item.payload = payload;
        }
        Ok(item)
    }

    pub fn delete_item(&self, id: &str) -> Result<()> {
        let _ = self.get_item(id)?;
        Ok(())
    }

    fn validate_payload(&self, payload: &str) -> Result<()> {
        if payload.is_empty() {
            return Err(Error::InvalidInput("payload cannot be empty".into()));
        }

        const MAX_PAYLOAD_LENGTH: usize = 1000;
        if payload.len() > MAX_PAYLOAD_LENGTH {
            return Err(Error::InvalidInput("payload exceeds maximum length".into()));
        }

        Ok(())
    }

    #[must_use]
    pub const fn config(&self) -> &Config {
        &self.config
    }
}

#[cfg(test)]
mod tests;

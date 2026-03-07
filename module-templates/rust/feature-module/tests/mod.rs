//! Split test module pattern
//!
//! Tests are organized into separate files by domain:
//! - tests_service.rs: Service behavior tests
//! - tests_types.rs: Domain type tests
//!
//! To run: `cargo test -p feature`

#[cfg(test)]
mod tests_service;

#[cfg(test)]
mod tests_types;

//! Tests for FeatureService

use super::*;

fn test_service() -> FeatureService {
    FeatureService::new(Config::default())
}

// -----------------------------------------------------------------------------
// create_item
// -----------------------------------------------------------------------------

#[test]
fn create_item_with_valid_payload_succeeds() {
    let service = test_service();
    let input = CreateInput {
        payload: "test payload".into(),
    };

    let result = service.create_item(input);

    assert!(result.is_ok());
    let item = result.unwrap();
    assert!(!item.id.is_empty());
    assert_eq!(item.payload, "test payload");
}

#[test]
fn create_item_with_empty_payload_fails() {
    let service = test_service();
    let input = CreateInput {
        payload: String::new(),
    };

    let result = service.create_item(input);

    assert!(matches!(result, Err(Error::InvalidInput(_))));
}

#[test]
fn create_item_with_oversized_payload_fails() {
    let service = test_service();
    let input = CreateInput {
        payload: "x".repeat(1001),
    };

    let result = service.create_item(input);

    assert!(matches!(result, Err(Error::InvalidInput(_))));
}

// -----------------------------------------------------------------------------
// get_item
// -----------------------------------------------------------------------------

#[test]
fn get_item_nonexistent_returns_not_found() {
    let service = test_service();

    let result = service.get_item("nonexistent-id");

    assert!(matches!(result, Err(Error::NotFound(_))));
}

// -----------------------------------------------------------------------------
// update_item
// -----------------------------------------------------------------------------

#[test]
fn update_item_with_empty_payload_fails() {
    let service = test_service();
    let input = UpdateInput {
        payload: Some(String::new()),
    };

    let result = service.update_item("some-id", input);

    assert!(matches!(result, Err(Error::InvalidInput(_))));
}

// -----------------------------------------------------------------------------
// delete_item
// -----------------------------------------------------------------------------

#[test]
fn delete_item_nonexistent_returns_not_found() {
    let service = test_service();

    let result = service.delete_item("nonexistent-id");

    assert!(matches!(result, Err(Error::NotFound(_))));
}

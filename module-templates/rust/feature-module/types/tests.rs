use super::*;

// -----------------------------------------------------------------------------
// Item
// -----------------------------------------------------------------------------

#[test]
fn item_new_generates_unique_ids() {
    let item1 = Item::new("payload1");
    let item2 = Item::new("payload2");

    assert_ne!(item1.id, item2.id);
}

#[test]
fn item_display_includes_id() {
    let item = Item::new("test");

    let display = format!("{item}");

    assert!(display.contains("Item"));
    assert!(display.contains(&item.id));
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

#[test]
fn config_default_has_expected_values() {
    let config = Config::default();

    assert!(config.field_one.is_empty());
    assert_eq!(config.ttl_seconds, 3600);
}

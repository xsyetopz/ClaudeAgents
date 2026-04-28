use super::OutputBudget;

#[test]
fn applies_line_budget() {
    let budgeted = OutputBudget::new(2, 100).apply("a\nb\nc");
    assert_eq!(budgeted.text, "a\nb");
    assert!(budgeted.truncated);
    assert_eq!(budgeted.line_count, 3);
}

#[test]
fn applies_byte_budget() {
    let budgeted = OutputBudget::new(10, 3).apply("abcd\nef");
    assert_eq!(budgeted.text, "");
    assert!(budgeted.truncated);
    assert_eq!(budgeted.byte_count, 7);
}

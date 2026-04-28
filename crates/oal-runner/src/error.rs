use crate::CommandError;

#[must_use]
pub const fn exact_error(text: String) -> CommandError {
    CommandError { text, exact: true }
}

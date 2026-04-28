use std::fs::{create_dir_all, write};
use std::path::Path;

use crate::CommandError;

pub fn write_artifact(
    dir: Option<&Path>,
    kind: &str,
    contents: &str,
) -> Result<Option<String>, CommandError> {
    let Some(dir) = dir else {
        return Ok(None);
    };
    if let Err(error) = create_dir_all(dir) {
        return Err(CommandError {
            text: error.to_string(),
            exact: true,
        });
    }
    let path = dir.join(format!("{kind}.log"));
    if let Err(error) = write(&path, contents) {
        return Err(CommandError {
            text: error.to_string(),
            exact: true,
        });
    }
    Ok(Some(path.display().to_string()))
}

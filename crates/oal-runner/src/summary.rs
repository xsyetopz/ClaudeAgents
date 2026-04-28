use crate::OutputBudget;

#[derive(Debug, serde::Serialize, PartialEq, Eq)]
pub struct CommandOutput {
    pub text: String,
    pub truncated: bool,
    #[serde(rename = "lineCount")]
    pub line_count: usize,
    #[serde(rename = "byteCount")]
    pub byte_count: usize,
}

#[derive(Debug, serde::Serialize, PartialEq, Eq)]
pub struct CommandError {
    pub text: String,
    pub exact: bool,
}

#[derive(Debug, serde::Serialize, PartialEq, Eq)]
pub struct CommandSummary {
    pub kind: String,
    pub ok: bool,
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
    pub output: CommandOutput,
    pub error: Option<CommandError>,
    #[serde(rename = "artifactPath")]
    pub artifact_path: Option<String>,
    pub budget: OutputBudget,
}

impl CommandSummary {
    #[must_use]
    pub const fn new(
        kind: String,
        ok: bool,
        exit_code: Option<i32>,
        output: CommandOutput,
        error: Option<CommandError>,
        artifact_path: Option<String>,
        budget: OutputBudget,
    ) -> Self {
        Self {
            kind,
            ok,
            exit_code,
            output,
            error,
            artifact_path,
            budget,
        }
    }

    #[must_use]
    pub fn to_json(&self) -> String {
        match serde_json::to_string(self) {
            Ok(json) => json,
            Err(error) => format!(
                "{{\"kind\":\"serialization\",\"ok\":false,\"exitCode\":null,\"output\":{{\"text\":\"\",\"truncated\":false,\"lineCount\":0,\"byteCount\":0}},\"error\":{{\"text\":\"{error}\",\"exact\":true}},\"artifactPath\":null,\"budget\":{{\"maxLines\":0,\"maxBytes\":0}}}}"
            ),
        }
    }
}

#[cfg(test)]
mod tests;

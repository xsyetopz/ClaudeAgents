#[derive(Clone, Copy, Debug, serde::Serialize, PartialEq, Eq)]
pub struct OutputBudget {
    #[serde(rename = "maxLines")]
    pub max_lines: usize,
    #[serde(rename = "maxBytes")]
    pub max_bytes: usize,
}

#[derive(Debug, PartialEq, Eq)]
pub struct BudgetedText {
    pub text: String,
    pub truncated: bool,
    pub line_count: usize,
    pub byte_count: usize,
}

impl Default for OutputBudget {
    fn default() -> Self {
        Self {
            max_lines: 120,
            max_bytes: 16_384,
        }
    }
}

impl OutputBudget {
    #[must_use]
    pub const fn new(max_lines: usize, max_bytes: usize) -> Self {
        Self {
            max_lines,
            max_bytes,
        }
    }

    #[must_use]
    pub fn apply(self, text: &str) -> BudgetedText {
        let mut output = String::new();
        let mut used_bytes = 0usize;
        let mut kept_lines = 0usize;
        let line_count = text.lines().count();
        let byte_count = text.len();

        for line in text.lines() {
            if kept_lines >= self.max_lines {
                break;
            }
            let line_bytes = line.len();
            let separator_bytes = usize::from(!output.is_empty());
            let next_bytes = used_bytes
                .saturating_add(separator_bytes)
                .saturating_add(line_bytes);
            if next_bytes > self.max_bytes {
                break;
            }
            if !output.is_empty() {
                output.push('\n');
                used_bytes = used_bytes.saturating_add(1);
            }
            output.push_str(line);
            used_bytes = used_bytes.saturating_add(line_bytes);
            kept_lines = kept_lines.saturating_add(1);
        }

        BudgetedText {
            text: output,
            truncated: kept_lines < line_count || used_bytes < byte_count,
            line_count,
            byte_count,
        }
    }
}

#[cfg(test)]
mod tests;

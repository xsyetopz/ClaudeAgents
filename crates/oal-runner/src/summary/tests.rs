use crate::OutputBudget;

use super::{CommandOutput, CommandSummary};

#[test]
fn json_uses_wire_shape() {
    let summary = CommandSummary::new(
        "read".to_owned(),
        true,
        Some(0),
        CommandOutput {
            text: "a\n\"b\"".to_owned(),
            truncated: false,
            line_count: 2,
            byte_count: 5,
        },
        None,
        None,
        OutputBudget::new(10, 100),
    );
    assert_eq!(
        summary.to_json(),
        "{\"kind\":\"read\",\"ok\":true,\"exitCode\":0,\"output\":{\"text\":\"a\\n\\\"b\\\"\",\"truncated\":false,\"lineCount\":2,\"byteCount\":5},\"error\":null,\"artifactPath\":null,\"budget\":{\"maxLines\":10,\"maxBytes\":100}}"
    );
}

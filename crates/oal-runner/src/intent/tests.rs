use std::env::temp_dir;
use std::fs::read_to_string;
use std::path::PathBuf;

use crate::{OutputBudget, RunOptions, run_intent, run_intent_with_options};

fn fixture_path(name: &str) -> String {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join(name)
        .display()
        .to_string()
}

#[test]
fn unsupported_intent_returns_failure() {
    let summary = run_intent("nope", &[]);
    assert!(!summary.ok);
    let error = summary.error.expect("error should exist");
    assert_eq!(error.text, "unsupported intent");
}

#[test]
fn read_requires_path() {
    let summary = run_intent("read", &[]);
    assert!(!summary.ok);
    let error = summary.error.expect("error should exist");
    assert_eq!(error.text, "missing path");
}

#[test]
fn output_budget_truncates() {
    let args = vec![fixture_path("intent.rs")];
    let options = RunOptions {
        budget: OutputBudget::new(1, 80),
        artifact_dir: None,
    };
    let summary = run_intent_with_options("read", &args, &options);
    assert!(summary.ok);
    assert!(summary.output.truncated);
    assert!(summary.output.line_count > 1);
}

#[test]
fn artifact_written_when_truncated() {
    let args = vec![fixture_path("intent.rs")];
    let options = RunOptions {
        budget: OutputBudget::new(1, 80),
        artifact_dir: Some(temp_dir().join("oal-runner-artifact-test")),
    };
    let summary = run_intent_with_options("read", &args, &options);
    assert!(summary.ok);
    let artifact_path = summary.artifact_path.expect("artifact path should exist");
    let artifact = read_to_string(artifact_path).expect("artifact should be readable");
    assert!(artifact.contains("run_intent"));
}

#[test]
fn all_intents_have_dispatch() {
    for kind in [
        "status", "diff", "search", "read", "list", "tree", "test", "build", "lint", "logs",
    ] {
        let summary = run_intent(kind, &[]);
        assert_ne!(
            summary.error.map(|error| error.text),
            Some("unsupported intent".to_owned())
        );
    }
}

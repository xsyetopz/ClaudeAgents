use std::fs::read_to_string;
use std::path::PathBuf;
use std::process::Command;

use crate::artifact::write_artifact;
use crate::budget::BudgetedText;
use crate::error::exact_error;
use crate::{CommandError, CommandOutput, CommandSummary, OutputBudget};

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RunOptions {
    pub budget: OutputBudget,
    pub artifact_dir: Option<PathBuf>,
}

#[must_use]
pub fn run_intent(kind: &str, args: &[String]) -> CommandSummary {
    run_intent_with_options(kind, args, &RunOptions::default())
}

#[must_use]
pub fn run_intent_with_options(
    kind: &str,
    args: &[String],
    options: &RunOptions,
) -> CommandSummary {
    match kind {
        "status" => run_native("status", "git", &["status", "--short", "--branch"], options),
        "diff" => run_native("diff", "git", &["diff", "--stat"], options),
        "list" => list(args, options),
        "tree" => tree(args, options),
        "read" => read_file(args.first(), options),
        "search" => search(args, options),
        "test" | "build" | "lint" => run_program_intent(kind, args, options),
        "logs" => logs(args.first(), options),
        unknown => failure(unknown, "unsupported intent".to_owned(), options.budget),
    }
}

fn run_program_intent(kind: &str, args: &[String], options: &RunOptions) -> CommandSummary {
    let Some(program) = args.first() else {
        return failure(kind, "missing program".to_owned(), options.budget);
    };
    let program_args = args.iter().skip(1).map(String::as_str).collect::<Vec<_>>();
    run_native(kind, program, &program_args, options)
}

fn list(args: &[String], options: &RunOptions) -> CommandSummary {
    let path = args.first().map_or(".", String::as_str);
    run_native("list", "ls", &["-la", path], options)
}

fn tree(args: &[String], options: &RunOptions) -> CommandSummary {
    let path = args.first().map_or(".", String::as_str);
    run_native("tree", "find", &[path, "-maxdepth", "3", "-print"], options)
}

fn logs(path: Option<&String>, options: &RunOptions) -> CommandSummary {
    path.map_or_else(
        || failure("logs", "missing path".to_owned(), options.budget),
        |path| run_native("logs", "tail", &["-n", "200", path], options),
    )
}

fn run_native(kind: &str, program: &str, args: &[&str], options: &RunOptions) -> CommandSummary {
    match Command::new(program).args(args).output() {
        Ok(output) => {
            let ok = output.status.success();
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let artifact_source = if ok { stdout.as_str() } else { stderr.as_str() };
            let error = if stderr.is_empty() {
                None
            } else {
                Some(stderr.clone())
            };
            summarize(
                kind,
                ok,
                output.status.code(),
                &stdout,
                error,
                artifact_source,
                options,
            )
        }
        Err(error) => failure(kind, error.to_string(), options.budget),
    }
}

fn read_file(path: Option<&String>, options: &RunOptions) -> CommandSummary {
    path.map_or_else(
        || failure("read", "missing path".to_owned(), options.budget),
        |path| match read_to_string(path) {
            Ok(contents) => summarize("read", true, Some(0), &contents, None, &contents, options),
            Err(error) => failure("read", error.to_string(), options.budget),
        },
    )
}

fn search(args: &[String], options: &RunOptions) -> CommandSummary {
    if args.is_empty() {
        return failure("search", "missing pattern".to_owned(), options.budget);
    }
    let pattern = args[0].as_str();
    let paths = if args.len() > 1 {
        args.iter().skip(1).map(String::as_str).collect::<Vec<_>>()
    } else {
        vec!["."]
    };
    let mut command_args = vec![pattern];
    command_args.extend(paths);
    run_native("search", "rg", &command_args, options)
}

fn summarize(
    kind: &str,
    ok: bool,
    exit_code: Option<i32>,
    stdout: &str,
    stderr: Option<String>,
    artifact_source: &str,
    options: &RunOptions,
) -> CommandSummary {
    let budgeted = options.budget.apply(stdout);
    let artifact_path = if budgeted.truncated {
        match write_artifact(options.artifact_dir.as_deref(), kind, artifact_source) {
            Ok(path) => path,
            Err(error) => {
                return CommandSummary::new(
                    kind.to_owned(),
                    false,
                    exit_code,
                    output_from_budgeted(budgeted),
                    Some(error),
                    None,
                    options.budget,
                );
            }
        }
    } else {
        None
    };
    CommandSummary::new(
        kind.to_owned(),
        ok,
        exit_code,
        output_from_budgeted(budgeted),
        stderr.map(exact_error),
        artifact_path,
        options.budget,
    )
}

fn output_from_budgeted(budgeted: BudgetedText) -> CommandOutput {
    CommandOutput {
        text: budgeted.text,
        truncated: budgeted.truncated,
        line_count: budgeted.line_count,
        byte_count: budgeted.byte_count,
    }
}

fn failure(kind: &str, message: String, budget: OutputBudget) -> CommandSummary {
    CommandSummary::new(
        kind.to_owned(),
        false,
        None,
        CommandOutput {
            text: String::new(),
            truncated: false,
            line_count: 0,
            byte_count: 0,
        },
        Some(CommandError {
            text: message,
            exact: true,
        }),
        None,
        budget,
    )
}

#[cfg(test)]
mod tests;

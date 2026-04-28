use std::path::PathBuf;

use clap::{Parser, Subcommand};
use oal_runner::{OutputBudget, RunOptions, run_intent_with_options};

#[derive(Parser)]
#[command(name = "oal-runner", about = "OpenAgentLayer command runner")]
struct Cli {
    #[arg(long, default_value_t = 120)]
    max_lines: usize,
    #[arg(long, default_value_t = 16_384)]
    max_bytes: usize,
    #[arg(long)]
    artifact_dir: Option<PathBuf>,
    #[command(subcommand)]
    command: Option<RunnerCommand>,
}

#[derive(Subcommand)]
enum RunnerCommand {
    Status,
    Diff,
    Search { pattern: String, paths: Vec<String> },
    Read { path: String },
    List { path: Option<String> },
    Tree { path: Option<String> },
    Test { program: String, args: Vec<String> },
    Build { program: String, args: Vec<String> },
    Lint { program: String, args: Vec<String> },
    Logs { path: String },
}

impl RunnerCommand {
    fn into_parts(self) -> (&'static str, Vec<String>) {
        match self {
            Self::Status => ("status", Vec::new()),
            Self::Diff => ("diff", Vec::new()),
            Self::Search { pattern, paths } => {
                let mut args = vec![pattern];
                args.extend(paths);
                ("search", args)
            }
            Self::Read { path } => ("read", vec![path]),
            Self::List { path } => ("list", path.into_iter().collect()),
            Self::Tree { path } => ("tree", path.into_iter().collect()),
            Self::Test { program, args } => with_program("test", program, args),
            Self::Build { program, args } => with_program("build", program, args),
            Self::Lint { program, args } => with_program("lint", program, args),
            Self::Logs { path } => ("logs", vec![path]),
        }
    }
}

fn with_program(
    kind: &'static str,
    program: String,
    args: Vec<String>,
) -> (&'static str, Vec<String>) {
    let mut out = vec![program];
    out.extend(args);
    (kind, out)
}

fn main() {
    let cli = Cli::parse();
    let options = RunOptions {
        artifact_dir: cli.artifact_dir,
        budget: OutputBudget::new(cli.max_lines, cli.max_bytes),
    };
    let (kind, args) = cli
        .command
        .map_or_else(|| ("status", Vec::new()), RunnerCommand::into_parts);
    println!(
        "{}",
        run_intent_with_options(kind, &args, &options).to_json()
    );
}

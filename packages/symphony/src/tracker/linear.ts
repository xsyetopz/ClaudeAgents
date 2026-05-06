import type {
	BlockerRef,
	Issue,
	SymphonyConfig,
	SymphonyTrackerClient,
} from "../types";

const LINEAR_ISSUES_QUERY = `query SymphonyIssues($projectSlug: String!, $states: [String!]) {
  issues(filter: { project: { slug: { eq: $projectSlug } }, state: { name: { in: $states } } }) {
    nodes {
      id
      identifier
      title
      description
      priority
      url
      branchName
      createdAt
      updatedAt
      state { name }
      labels { nodes { name } }
      relations {
        nodes {
          relatedIssue {
            id
            identifier
            state { name }
            createdAt
            updatedAt
          }
          type
        }
      }
    }
  }
}`;
const LINEAR_ISSUES_BY_ID_QUERY = `query SymphonyIssuesById($issueIds: [String!]) {
  issues(filter: { id: { in: $issueIds } }) {
    nodes {
      id
      identifier
      title
      description
      priority
      url
      branchName
      createdAt
      updatedAt
      state { name }
      labels { nodes { name } }
      relations {
        nodes {
          relatedIssue {
            id
            identifier
            state { name }
            createdAt
            updatedAt
          }
          type
        }
      }
    }
  }
}`;

export class LinearTrackerClient implements SymphonyTrackerClient {
	readonly #fetchImpl: typeof fetch;

	constructor(fetchImpl: typeof fetch = fetch) {
		this.#fetchImpl = fetchImpl;
	}

	async fetchCandidateIssues(config: SymphonyConfig): Promise<Issue[]> {
		const states = [
			...config.tracker.active_states,
			...config.tracker.terminal_states,
		];
		const data = await this.#request(config, LINEAR_ISSUES_QUERY, {
			projectSlug: config.tracker.project_slug,
			states,
		});
		return normalizeLinearIssues(data);
	}

	async fetchIssueStates(
		issueIds: string[],
		config: SymphonyConfig,
	): Promise<Issue[]> {
		if (issueIds.length === 0) return [];
		const data = await this.#request(config, LINEAR_ISSUES_BY_ID_QUERY, {
			issueIds,
		});
		return normalizeLinearIssues(data);
	}

	async fetchTerminalIssues(config: SymphonyConfig): Promise<Issue[]> {
		const data = await this.#request(config, LINEAR_ISSUES_QUERY, {
			projectSlug: config.tracker.project_slug,
			states: config.tracker.terminal_states,
		});
		return normalizeLinearIssues(data);
	}

	async #request(
		config: SymphonyConfig,
		query: string,
		variables: Record<string, unknown>,
	): Promise<unknown> {
		const response = await this.#fetchImpl(config.tracker.endpoint, {
			method: "POST",
			headers: {
				authorization: config.tracker.api_key,
				"content-type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
		});
		if (!response.ok)
			throw new Error(`Linear request failed with status ${response.status}`);
		const payload = (await response.json()) as {
			data?: unknown;
			errors?: { message?: string }[];
		};
		const errors = payload.errors ?? [];
		if (errors.length > 0)
			throw new Error(
				errors.map((error) => error.message ?? "Linear error").join("; "),
			);
		return payload.data;
	}
}

function normalizeLinearIssues(data: unknown): Issue[] {
	const issues = asRecord(
		asRecord(data, "Linear data")["issues"],
		"Linear issues",
	);
	const nodes = issues["nodes"];
	if (!Array.isArray(nodes)) return [];
	return nodes.map(normalizeLinearIssue);
}

function normalizeLinearIssue(node: unknown): Issue {
	const issue = asRecord(node, "Linear issue");
	const state = asRecord(issue["state"], "Linear issue state", true);
	const labels = asRecord(issue["labels"], "Linear issue labels", true);
	const relations = asRecord(
		issue["relations"],
		"Linear issue relations",
		true,
	);
	return {
		id: stringValue(issue["id"], "issue.id"),
		identifier: stringValue(issue["identifier"], "issue.identifier"),
		title: stringValue(issue["title"], "issue.title"),
		description:
			typeof issue["description"] === "string" ? issue["description"] : null,
		priority: typeof issue["priority"] === "number" ? issue["priority"] : null,
		state: stringValue(state["name"], "issue.state"),
		branch_name:
			typeof issue["branchName"] === "string" ? issue["branchName"] : null,
		url: typeof issue["url"] === "string" ? issue["url"] : null,
		labels: Array.isArray(labels["nodes"])
			? labels["nodes"]
					.map((label) => asRecord(label, "Linear label")["name"])
					.filter((label): label is string => typeof label === "string")
					.map((label) => label.toLowerCase())
			: [],
		blocked_by: normalizeLinearBlockers(relations["nodes"]),
		created_at:
			typeof issue["createdAt"] === "string" ? issue["createdAt"] : null,
		updated_at:
			typeof issue["updatedAt"] === "string" ? issue["updatedAt"] : null,
	};
}

function normalizeLinearBlockers(relations: unknown): BlockerRef[] {
	if (!Array.isArray(relations)) return [];
	return relations
		.map((relation) => asRecord(relation, "Linear relation"))
		.filter((relation) => relation["type"] === "blocks")
		.map((relation) =>
			asRecord(relation["relatedIssue"], "Linear related issue", true),
		)
		.map((issue) => {
			const state = asRecord(issue["state"], "Linear related state", true);
			return {
				id: optionalString(issue["id"]) ?? null,
				identifier: optionalString(issue["identifier"]) ?? null,
				state: optionalString(state["name"]) ?? null,
				created_at: optionalString(issue["createdAt"]) ?? null,
				updated_at: optionalString(issue["updatedAt"]) ?? null,
			};
		});
}

function asRecord(
	value: unknown,
	label: string,
	optional = false,
): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value))
		return value as Record<string, unknown>;
	if (optional || value == null) return {};
	throw new Error(`${label} must be an object`);
}

function stringValue(value: unknown, label: string): string {
	if (typeof value === "string" && value.length > 0) return value;
	throw new Error(`${label} is required`);
}

function optionalString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

export interface PolicyIssue {
	severity: "error" | "warning";
	code: string;
	message: string;
	sourceId?: string;
}

export interface PolicyReport {
	issues: PolicyIssue[];
}

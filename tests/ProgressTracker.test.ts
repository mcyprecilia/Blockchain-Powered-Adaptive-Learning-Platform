import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, principalCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_MODULE_ID = 101;
const ERR_INVALID_SCORE = 102;
const ERR_INVALID_STATUS = 106;
const ERR_INVALID_ATTEMPTS = 107;
const ERR_INVALID_DURATION = 108;
const ERR_INVALID_PLATFORM = 109;
const ERR_PROGRESS_NOT_FOUND = 105;

interface Progress {
	score: number;
	timestamp: number;
	status: string;
	attempts: number;
	duration: number;
	platformId: string;
}

interface Audit {
	lastUpdated: number;
	updater: string;
	previousScore: number;
	previousStatus: string;
}

interface Result<T> {
	ok: boolean;
	value: T;
}

class ProgressTrackerMock {
	state: {
		contractOwner: string;
		progressCounter: number;
		maxProgressEntries: number;
		userProgress: Map<string, Progress>;
		userProgressCount: Map<string, number>;
		progressAudit: Map<string, Audit>;
	} = {
		contractOwner: "ST1TEST",
		progressCounter: 0,
		maxProgressEntries: 10000,
		userProgress: new Map(),
		userProgressCount: new Map(),
		progressAudit: new Map(),
	};
	blockHeight: number = 0;
	caller: string = "ST1TEST";

	constructor() {
		this.reset();
	}

	reset() {
		this.state = {
			contractOwner: "ST1TEST",
			progressCounter: 0,
			maxProgressEntries: 10000,
			userProgress: new Map(),
			userProgressCount: new Map(),
			progressAudit: new Map(),
		};
		this.blockHeight = 0;
		this.caller = "ST1TEST";
	}

	getProgress(user: string, moduleId: number): Result<Progress | null> {
		return {
			ok: true,
			value: this.state.userProgress.get(`${user}-${moduleId}`) || null,
		};
	}

	getProgressCount(user: string): Result<number> {
		return { ok: true, value: this.state.userProgressCount.get(user) || 0 };
	}

	getProgressAudit(user: string, moduleId: number): Result<Audit | null> {
		return {
			ok: true,
			value: this.state.progressAudit.get(`${user}-${moduleId}`) || null,
		};
	}

	setMaxProgressEntries(newMax: number): Result<boolean> {
		if (this.caller !== this.state.contractOwner)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		if (newMax <= 0) return { ok: false, value: ERR_INVALID_MODULE_ID };
		this.state.maxProgressEntries = newMax;
		return { ok: true, value: true };
	}

	updateProgress(
		moduleId: number,
		score: number,
		status: string,
		attempts: number,
		duration: number,
		platformId: string
	): Result<boolean> {
		const progressKey = `${this.caller}-${moduleId}`;
		const count = this.state.userProgressCount.get(this.caller) || 0;
		if (count >= this.state.maxProgressEntries)
			return { ok: false, value: ERR_INVALID_MODULE_ID };
		if (moduleId <= 0) return { ok: false, value: ERR_INVALID_MODULE_ID };
		if (score > 100) return { ok: false, value: ERR_INVALID_SCORE };
		if (!["completed", "in-progress", "failed"].includes(status))
			return { ok: false, value: ERR_INVALID_STATUS };
		if (attempts > 10) return { ok: false, value: ERR_INVALID_ATTEMPTS };
		if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
		if (platformId.length === 0 || platformId.length > 50)
			return { ok: false, value: ERR_INVALID_PLATFORM };

		const currentProgress = this.state.userProgress.get(progressKey);
		const progress: Progress = {
			score,
			timestamp: this.blockHeight,
			status,
			attempts,
			duration,
			platformId,
		};
		this.state.userProgress.set(progressKey, progress);
		this.state.progressAudit.set(progressKey, {
			lastUpdated: this.blockHeight,
			updater: this.caller,
			previousScore: currentProgress ? currentProgress.score : 0,
			previousStatus: currentProgress ? currentProgress.status : "none",
		});
		this.state.userProgressCount.set(this.caller, count + 1);
		this.state.progressCounter++;
		return { ok: true, value: true };
	}

	deleteProgress(moduleId: number): Result<boolean> {
		const progressKey = `${this.caller}-${moduleId}`;
		const progress = this.state.userProgress.get(progressKey);
		if (!progress) return { ok: false, value: ERR_PROGRESS_NOT_FOUND };
		this.state.progressAudit.set(progressKey, {
			lastUpdated: this.blockHeight,
			updater: this.caller,
			previousScore: progress.score,
			previousStatus: progress.status,
		});
		this.state.userProgress.delete(progressKey);
		const count = this.state.userProgressCount.get(this.caller) || 0;
		this.state.userProgressCount.set(this.caller, count - 1);
		this.state.progressCounter--;
		return { ok: true, value: true };
	}

	transferOwnership(newOwner: string): Result<boolean> {
		if (this.caller !== this.state.contractOwner)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		this.state.contractOwner = newOwner;
		return { ok: true, value: true };
	}
}

describe("ProgressTrackerContract", () => {
	let contract: ProgressTrackerMock;

	beforeEach(() => {
		contract = new ProgressTrackerMock();
		contract.reset();
	});

	it("updates progress successfully", () => {
		const result = contract.updateProgress(
			1,
			85,
			"completed",
			2,
			3600,
			"platform-xyz"
		);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		const progress = contract.getProgress("ST1TEST", 1).value;
		expect(progress?.score).toBe(85);
		expect(progress?.status).toBe("completed");
		expect(progress?.attempts).toBe(2);
		expect(progress?.duration).toBe(3600);
		expect(progress?.platformId).toBe("platform-xyz");
		expect(progress?.timestamp).toBe(0);
		const audit = contract.getProgressAudit("ST1TEST", 1).value;
		expect(audit?.lastUpdated).toBe(0);
		expect(audit?.updater).toBe("ST1TEST");
		expect(audit?.previousScore).toBe(0);
		expect(audit?.previousStatus).toBe("none");
		expect(contract.getProgressCount("ST1TEST").value).toBe(1);
		expect(contract.state.progressCounter).toBe(1);
	});

	it("rejects invalid module ID", () => {
		const result = contract.updateProgress(
			0,
			85,
			"completed",
			2,
			3600,
			"platform-xyz"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_MODULE_ID);
	});

	it("rejects invalid score", () => {
		const result = contract.updateProgress(
			1,
			101,
			"completed",
			2,
			3600,
			"platform-xyz"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_SCORE);
	});

	it("rejects invalid status", () => {
		const result = contract.updateProgress(
			1,
			85,
			"invalid",
			2,
			3600,
			"platform-xyz"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_STATUS);
	});

	it("rejects invalid attempts", () => {
		const result = contract.updateProgress(
			1,
			85,
			"completed",
			11,
			3600,
			"platform-xyz"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_ATTEMPTS);
	});

	it("rejects invalid duration", () => {
		const result = contract.updateProgress(
			1,
			85,
			"completed",
			2,
			0,
			"platform-xyz"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_DURATION);
	});

	it("rejects invalid platform ID", () => {
		const result = contract.updateProgress(1, 85, "completed", 2, 3600, "");
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_PLATFORM);
	});

	it("deletes progress successfully", () => {
		contract.updateProgress(1, 85, "completed", 2, 3600, "platform-xyz");
		const result = contract.deleteProgress(1);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		expect(contract.getProgress("ST1TEST", 1).value).toBe(null);
		const audit = contract.getProgressAudit("ST1TEST", 1).value;
		expect(audit?.previousScore).toBe(85);
		expect(audit?.previousStatus).toBe("completed");
		expect(contract.getProgressCount("ST1TEST").value).toBe(0);
		expect(contract.state.progressCounter).toBe(0);
	});

	it("rejects delete for non-existent progress", () => {
		const result = contract.deleteProgress(1);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_PROGRESS_NOT_FOUND);
	});

	it("sets max progress entries successfully", () => {
		const result = contract.setMaxProgressEntries(5000);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		expect(contract.state.maxProgressEntries).toBe(5000);
	});

	it("rejects max progress entries by non-owner", () => {
		contract.caller = "ST2FAKE";
		const result = contract.setMaxProgressEntries(5000);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_NOT_AUTHORIZED);
	});

	it("transfers ownership successfully", () => {
		const result = contract.transferOwnership("ST2TEST");
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		expect(contract.state.contractOwner).toBe("ST2TEST");
	});

	it("rejects ownership transfer by non-owner", () => {
		contract.caller = "ST2FAKE";
		const result = contract.transferOwnership("ST3TEST");
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_NOT_AUTHORIZED);
	});
});

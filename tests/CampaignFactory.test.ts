import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_CAMPAIGN_ENDED = 101;
const ERR_GOAL_NOT_MET = 102;
const ERR_INVALID_AMOUNT = 103;
const ERR_INVALID_GOAL = 104;
const ERR_INVALID_DEADLINE = 105;
const ERR_ALREADY_INITIALIZED = 106;
const ERR_NOT_ORGANIZER = 107;
const ERR_INVALID_TITLE = 108;
const ERR_CAMPAIGN_NOT_FOUND = 109;
const ERR_AUTHORITY_NOT_VERIFIED = 110;

interface Campaign {
  title: string;
  goalAmount: number;
  totalRaised: number;
  deadline: number;
  isActive: boolean;
  organizer: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class CampaignMock {
  state: {
    nextCampaignId: number;
    creationFee: number;
    authorityContract: string | null;
    campaigns: Map<number, Campaign>;
    donations: Map<string, number>;
    campaignsByTitle: Map<string, number>;
  } = {
    nextCampaignId: 0,
    creationFee: 1000,
    authorityContract: null,
    campaigns: new Map(),
    donations: new Map(),
    campaignsByTitle: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  reset() {
    this.state = {
      nextCampaignId: 0,
      creationFee: 1000,
      authorityContract: null,
      campaigns: new Map(),
      donations: new Map(),
      campaignsByTitle: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") return { ok: false, value: false };
    if (this.state.authorityContract !== null) return { ok: false, value: false };
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  createCampaign(title: string, goal: number, duration: number): Result<number> {
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (goal <= 0) return { ok: false, value: ERR_INVALID_GOAL };
    if (this.blockHeight + duration <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (this.state.campaignsByTitle.has(title)) return { ok: false, value: ERR_ALREADY_INITIALIZED };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });
    const id = this.state.nextCampaignId;
    this.state.campaigns.set(id, { title, goalAmount: goal, totalRaised: 0, deadline: this.blockHeight + duration, isActive: true, organizer: this.caller });
    this.state.campaignsByTitle.set(title, id);
    this.state.nextCampaignId++;
    return { ok: true, value: id };
  }

  getCampaign(id: number): Campaign | null {
    return this.state.campaigns.get(id) || null;
  }

  donate(id: number, amount: number): Result<boolean> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign) return { ok: false, value: false };
    if (!campaign.isActive || this.blockHeight > campaign.deadline) return { ok: false, value: false };
    if (amount <= 0) return { ok: false, value: false };
    this.stxTransfers.push({ amount, from: this.caller, to: null });
    const key = `${id}-${this.caller}`;
    this.state.donations.set(key, (this.state.donations.get(key) || 0) + amount);
    campaign.totalRaised += amount;
    this.state.campaigns.set(id, campaign);
    return { ok: true, value: true };
  }

  withdrawFunds(id: number, amount: number): Result<boolean> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign || campaign.organizer !== this.caller) return { ok: false, value: false };
    if (campaign.totalRaised < campaign.goalAmount || amount <= 0) return { ok: false, value: false };
    this.stxTransfers.push({ amount, from: null, to: this.caller });
    campaign.totalRaised -= amount;
    this.state.campaigns.set(id, campaign);
    return { ok: true, value: true };
  }

  getCampaignCount(): Result<number> {
    return { ok: true, value: this.state.nextCampaignId };
  }
}

describe("Campaign", () => {
  let contract: CampaignMock;
  beforeEach(() => {
    contract = new CampaignMock();
    contract.reset();
  });

  it("creates a campaign successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign("School Build", 10000, 30);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const campaign = contract.getCampaign(0);
    expect(campaign?.title).toBe("School Build");
    expect(campaign?.goalAmount).toBe(10000);
    expect(campaign?.totalRaised).toBe(0);
    expect(campaign?.isActive).toBe(true);
    expect(campaign?.organizer).toBe("ST1TEST");
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate campaign titles", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign("School Build", 10000, 30);
    const result = contract.createCampaign("School Build", 20000, 60);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_INITIALIZED);
  });

  it("rejects campaign creation without authority", () => {
    const result = contract.createCampaign("School Build", 10000, 30);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid goal amount", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign("School Build", 0, 30);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GOAL);
  });

  it("accepts donation successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign("School Build", 10000, 30);
    const result = contract.donate(0, 500);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.totalRaised).toBe(500);
    expect(contract.stxTransfers.length).toBe(2);
  });

  it("rejects donation to ended campaign", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign("School Build", 10000, 30);
    contract.blockHeight = 31;
    const result = contract.donate(0, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("withdraws funds successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign("School Build", 10000, 30);
    contract.donate(0, 10000);
    const result = contract.withdrawFunds(0, 5000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.totalRaised).toBe(5000);
    expect(contract.stxTransfers.length).toBe(3);
  });

  it("rejects withdraw if goal not met", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign("School Build", 10000, 30);
    contract.donate(0, 5000);
    const result = contract.withdrawFunds(0, 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct campaign count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign("Campaign1", 10000, 30);
    contract.createCampaign("Campaign2", 20000, 60);
    const result = contract.getCampaignCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("parses campaign parameters with Clarity types", () => {
    const title = stringUtf8CV("TestCampaign");
    const goal = uintCV(10000);
    expect(title.value).toBe("TestCampaign");
    expect(goal.value).toEqual(BigInt(10000));
  });
});
# 🌍 Decentralized Crowdfunding for Village Infrastructure

Welcome to a revolutionary Web3 platform that empowers communities to crowdfund essential village infrastructure projects—like schools, roads, clean water systems, and solar power installations—while ensuring full transparency through verifiable fund usage reports. Built on the Stacks blockchain using Clarity smart contracts, this project solves the real-world problem of mistrust in traditional crowdfunding by leveraging immutable blockchain records to track every donation, milestone, and expenditure. No more opaque NGOs or misallocated funds; everything is auditable on-chain!

## ✨ Features
🌱 Create and launch village-specific crowdfunding campaigns with defined goals and milestones  
💰 Secure donations in STX or custom tokens, held in escrow until verified progress  
📊 Verifiable reports: Project leads submit hashed proofs (e.g., photos, receipts) for on-chain validation  
🗳️ Community governance: Donors vote on milestone approvals and fund releases  
🔍 Transparent audits: Anyone can query fund flows, reports, and outcomes  
🚀 Scalable for global impact: Supports multiple villages and projects simultaneously  
🔒 Anti-fraud measures: Prevent duplicate campaigns and enforce spending rules  
📈 Impact tracking: Generate reports on completed infrastructure and community benefits  

## 🛠 How It Works
This project utilizes 8 smart contracts written in Clarity to handle the end-to-end process. Here's a high-level overview:

### Smart Contracts Overview
1. **CampaignFactory**: Deploys new Campaign contracts for each village project, ensuring standardized creation with initial parameters like goal amount, duration, and village ID.  
2. **Campaign**: Core contract per project; manages fundraising, tracks donations, and enforces rules like minimum contributions and refund policies if goals aren't met.  
3. **EscrowVault**: Holds donated funds securely; releases them only upon milestone approvals via multisig or oracle verification.  
4. **MilestoneManager**: Defines and tracks project milestones (e.g., "Foundation laid" or "Water well drilled"); integrates with report submissions for progress updates.  
5. **ReportVerifier**: Validates submitted reports using hashed proofs (e.g., IPFS links to evidence); employs zero-knowledge proofs or simple hash matching for privacy-preserving verification.  
6. **GovernanceToken**: Issues ERC-20-like tokens to donors based on contribution size; used for voting power in decision-making.  
7. **VotingDAO**: Handles community votes on milestone approvals, fund releases, or project amendments; uses token-weighted voting to prevent sybil attacks.  
8. **AuditLogger**: Logs all transactions, reports, and decisions immutably; provides query functions for external auditors or dashboards.  

### For Village Leaders (Project Creators)
- Propose a new infrastructure project via the CampaignFactory contract, specifying details like total funding goal, milestones, and expected impact.  
- Once launched, promote the Campaign contract address to attract donors.  
- As work progresses, submit verifiable reports (e.g., hash of receipts or geo-tagged photos) to the ReportVerifier and MilestoneManager.  
- Request fund releases through the VotingDAO after each milestone.  

Boom! Funds are disbursed transparently, and your village gets the infrastructure it needs.

### For Donors
- Contribute STX or tokens directly to a Campaign contract—your donation is locked in the EscrowVault.  
- Receive GovernanceTokens proportional to your donation for voting rights.  
- Monitor progress: Query the AuditLogger for real-time fund status or use get-milestone-details in MilestoneManager.  
- Vote on reports and releases via the VotingDAO to ensure accountability.  

If a project fails or fraud is detected, vote for refunds!

### For Verifiers/Auditors
- Use verify-report in ReportVerifier to check hashed proofs against submitted evidence.  
- Call get-audit-trail in AuditLogger to trace every transaction and decision.  
- Instant on-chain confirmation: No need for third-party audits—it's all decentralized and immutable.  

That's it! This system fosters trust, reduces corruption, and accelerates development in underserved villages worldwide. Deploy on Stacks testnet to get started, and scale to mainnet for real impact.
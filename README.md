# 📚 Blockchain-Powered Adaptive Learning Platform

Welcome to a revolutionary Web3 solution for personalized education! This project uses the Stacks blockchain and Clarity smart contracts to store AI-generated adaptive learning paths and user progress securely. It solves the real-world problem of fragmented learning experiences across platforms—users often lose their progress, certifications, and personalized recommendations when switching apps or services. By leveraging blockchain, progress is immutable, verifiable, and portable, enabling seamless transitions while integrating AI for dynamic path adjustments.

## ✨ Features

🔒 Secure, tamper-proof storage of user learning progress and paths  
🤖 AI-driven adaptive recommendations (integrated via off-chain oracles)  
🔄 Seamless platform switching with verifiable data export/import  
🏆 On-chain certification and achievement badges  
💰 Token-based incentives for completing milestones  
✅ Cross-platform verification of progress and credentials  
📊 Analytics for educators to track aggregate learner trends (anonymized)  
🚫 Privacy controls to manage data sharing  

## 🛠 How It Works

**For Learners**  
- Register your profile and start a course.  
- As you progress, AI (off-chain) analyzes your performance and suggests adaptive paths, which are stored on-chain.  
- Update progress after each module—it's timestamped and immutable.  
- Earn tokens for milestones and receive verifiable certificates.  
- Switch platforms? Export your on-chain data and import it elsewhere for continuity.  

**For Educators/Platforms**  
- Define learning modules and paths.  
- Use oracles to feed AI recommendations into the blockchain.  
- Verify user progress instantly via smart contract queries.  
- Reward users and govern updates to paths or incentives.  

**AI Integration**  
AI models (e.g., for path adaptation based on quiz results or time spent) run off-chain but commit recommendations to the blockchain via oracles for transparency and auditability. This ensures paths evolve with user needs while remaining secure.

## 📜 Smart Contracts Overview

This project involves 8 smart contracts written in Clarity, each handling a specific aspect of the system for modularity and security. Here's a breakdown:

1. **UserProfileContract**: Manages user registration, profile data (e.g., username, preferences), and authentication hooks. Ensures only authorized users can update their own data.  

2. **ProgressTrackerContract**: Stores granular user progress (e.g., module completions, scores, timestamps). Uses maps for efficient querying and prevents unauthorized modifications.  

3. **LearningPathContract**: Defines and stores adaptive learning paths as structured data (e.g., sequences of modules with branching logic). Allows AI-oracle updates for personalization.  

4. **AIOracleContract**: Acts as an entry point for off-chain AI services to submit path recommendations or progress analyses. Validates oracle inputs and triggers updates in other contracts.  

5. **CertificationContract**: Issues non-fungible tokens (NFTs) or badges for course completions. Verifies progress thresholds before minting and allows public verification.  

6. **TokenIncentiveContract**: Handles fungible tokens (e.g., SIP-10 compliant) for rewards. Distributes tokens on milestones and manages staking for premium access.  

7. **AccessControlContract**: Enforces roles and permissions (e.g., admin for educators, read-only for verifiers). Uses principals for fine-grained control across the system.  

8. **GovernanceContract**: Enables decentralized updates, such as adding new paths or adjusting reward parameters. Uses voting mechanisms for community or admin-driven changes.  

These contracts interact via cross-contract calls for a cohesive system. For example, completing a module in ProgressTrackerContract triggers a check in CertificationContract and a reward in TokenIncentiveContract.

## 🚀 Getting Started

1. Set up a Stacks development environment with Clarity.  
2. Deploy the contracts in order (starting with UserProfileContract).  
3. Integrate an off-chain AI service (e.g., using machine learning libraries like TensorFlow) to generate paths and connect via the AIOracleContract.  
4. Build a frontend (e.g., with React) to interact with the contracts via the Stacks.js library.  

Example Clarity snippet for registering progress (from ProgressTrackerContract):  
```clarity
(define-public (update-progress (user principal) (module-id uint) (score uint))
  (let ((current-progress (map-get? user-progress {user: user})))
    (asserts! (is-eq tx-sender user) (err u401)) ;; Only user can update
    (map-set user-progress {user: user}
      (merge (unwrap! current-progress (err u404))
        {module-id: module-id, score: score, timestamp: (block-height)}))
    (ok true)))
```

This project empowers lifelong learners by making education portable and personalized—join the future of decentralized learning!
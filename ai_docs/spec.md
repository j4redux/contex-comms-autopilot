# Project Omni — Product Specification

## Elevator Pitch

Omni turns founder thoughts into investor-ready materials in minutes—memos, updates, and fundraising documents that close deals and sound like you at your sharpest. Omni remembers everything, so founders never explain the same context twice.

## Core Value Proposition

**Your Corporate Comms Autopilot that never forgets**

Transform scattered founder thoughts into polished investor-grade documents while building a persistent knowledge base that grows smarter with every interaction. Once founders build context in Omni, switching costs become prohibitive—creating a powerful moat.

## User Workflow

1. **Input**: Founder brain dumps about metrics, challenges, wins, strategic plans, fundraising progress
2. **Processing**: Claude Code structures information and applies investor communication best practices
3. **Output**: Investor-ready materials (updates, memos, fundraising docs) that actually close deals

## Core Features

### 1. Entity Extraction & Tracking
- Automatically identifies people, companies, projects from inputs
- Maintains relationships and context over time
- Creates searchable entity database

### 2. Pattern Recognition
- Detects recurring themes, concerns, opportunities
- Updates intelligence files with insights
- Flags urgent matters requiring attention

### 3. Investor-Grade Document Generation
- **Investor updates**: Monthly/quarterly progress reports with metrics and narrative
- **Investment memos**: Fundraising documents that communicate value proposition and traction
- **Pitch deck narratives**: Compelling story frameworks for presentations
- **Due diligence responses**: Structured answers to investor questions
- **Board meeting materials**: Executive summaries and strategic recommendations

### 4. Decision Support
- Builds decision packages with options and analysis
- Creates structured decision frameworks
- Tracks decision outcomes and learnings

### 5. Intelligent Search & Retrieval
- JSON indexes for fast knowledge lookup
- Autocomplete suggestions based on usage patterns
- Cross-references entities and projects

### 6. Persistent Knowledge Base
- **Context Accumulation**: Every interaction builds on previous knowledge
- **Zero Repetition**: Never explain the same context twice
- **Workspace Persistence**: Sandboxes survive server restarts (Workspace-as-a-Service)
- **Growing Intelligence**: System gets smarter with each use

## Business Model & Revenue Strategy

### Target Market
- **Initial**: Seed to Series B startups (10,000+ companies)
- **Expansion**: Growth-stage companies and enterprise teams
- **TAM**: $2B+ (investor relations + internal communications)

### Revenue Model
- **Pricing**: $500-2,000/month per company
- **Target**: $10M ARR from investor communications alone
- **Moat**: High switching costs once context is built

### Expansion Strategy (Wedge Approach)
1. **Phase 1**: Investor communications (current focus)
   - Updates, memos, fundraising documents
   - Immediate value, clear ROI
   
2. **Phase 2**: Internal updates
   - Team updates, project status reports
   - Natural extension of existing workflows
   
3. **Phase 3**: Enterprise coordination
   - Cross-functional alignment
   - Executive briefings and strategic planning

## Architecture

### Three-Tier System

1. **Frontend**: Next.js 15 web application with React 19 and TypeScript
2. **Backend**: Bun server with Inngest event-driven architecture
3. **Processing**: Claude Code 1.0.80 execution in isolated Daytona sandboxes

### Sandbox Knowledge Structure

```
/home/omni/
├── metrics/                      # Business metrics and KPIs
│   ├── current.json             # Current metrics snapshot
│   └── historical/              # Historical metrics tracking
├── stakeholders/                 # Key relationships
│   ├── investors/               # Investor profiles and interactions
│   └── customers/               # Customer data and feedback
├── updates/                      # Progress updates and reports
├── deliverables/                 # Investor-ready materials
│   ├── emails/                  # Email templates and drafts
│   ├── memos/                   # Investment memos and documents
│   └── presentations/           # Pitch decks and slide narratives
├── context/                      # Business context and intelligence
│   ├── company.json             # Company profile and details
│   ├── product.json             # Product information and roadmap
│   ├── market.json              # Market analysis and positioning
│   └── entities.json            # People, companies, relationships
├── founder_profile/              # Founder preferences and style
│   └── voice.json               # Communication style and tone
└── README.md                     # System instructions for Claude
```

### Pre-initialized JSON Files

Each sandbox comes with structured JSON files that Claude updates:

- **metrics/current.json**: Tracks current business metrics
- **context/company.json**: Company name, stage, mission, vision, values
- **context/product.json**: Product details, features, roadmap
- **context/market.json**: Market size, growth, competitors, positioning
- **context/entities.json**: Investors, customers, team relationships
- **founder_profile/voice.json**: Writing style preferences and tone

## Key Design Principles

### Memory-First Architecture
- **Never Forget**: Persistent workspaces that survive restarts
- **Context Accumulation**: Each interaction builds on all previous knowledge
- **Zero Repetition**: Founders never explain the same thing twice
- **Growing Returns**: Value compounds with each use

### "You at Your Sharpest"
- **Voice Preservation**: Sounds authentically like the founder
- **Elevated Communication**: Professional polish without losing personality
- **Consistent Excellence**: Every document at your best quality level

### "Knowledge as Code"
- Structured, executable intelligence
- Every file contributes to understanding business context
- Filesystem IS the working memory

### Investor-Ready Materials Focus  
- Create documents that actually close deals, not just organized notes
- Materials should be immediately shareable with investors
- Apply investor communication best practices and proven frameworks

### Privacy & Security
- Per-user sandbox isolation
- No data mixing between founders
- Secure API key handling

## Technical Implementation

### Backend (Bun + TypeScript)
- Bun runtime with Effect for async composition
- Inngest event-driven architecture (no REST APIs for processing)
- Real-time streaming via Inngest channels
- Daytona SDK integration for sandbox orchestration

### Processing (Claude Code in Sandboxes)
- Docker containers with Ubuntu 22.04 base image
- Claude Code 1.0.80 pre-installed via install script
- Isolated sandboxes per user with persistent filesystem
- Restricted tool permissions for security (no rm, sudo, curl)
- Working directory: `/home/omni/`

### Frontend (Next.js Web App)
- Next.js 15.3.3 with App Router and React 19
- Zustand for state management with localStorage persistence
- Inngest real-time subscriptions for live updates
- TailwindCSS 4 + Radix UI components
- TypeScript for type safety

## Market Validation & Traction

### Problem Discovery
- **20+ founder interviews** validating pain points
- Key insight: Founders waste 10+ hours/month on investor communications
- Consistent feedback: "I hate writing updates but know they're critical"

### Early Traction
- **2 confirmed design partners** from first sales conversations
- **1 potential paying customer** willing to pay $2,000/month upon implementation
- **Production-ready** after focused development sprint

## Success Metrics

### Business Metrics
- **ARR Target**: $10M from investor communications alone
- **Customer Acquisition**: 500 paying customers in Year 1
- **Retention**: >95% monthly retention (switching costs moat)
- **Expansion Revenue**: 140% net revenue retention via upsells

### Product Metrics
- **Time from brain dump to investor-ready material** (<2 minutes)
- **Material usage rate** (founder actually sends/presents the output)
- **User Growth**: 50% month-over-month in early stage

### Technical Metrics
- Workspace persistence across restarts (100% reliability)
- Claude execution reliability (>99.5%)
- Web app responsiveness (<100ms UI updates) 
- Cost per processing request (<$0.10)
- Real-time streaming latency (<100ms)

## Competitive Advantages

1. **Persistent Memory**: "Never explain the same context twice" - workspace persistence creates compound value
2. **High Switching Costs**: Once months of context are built, moving to another tool means starting over
3. **"You at Your Sharpest"**: Preserves authentic founder voice while elevating quality
4. **Investor-Communication Expertise**: Purpose-built for fundraising, not generic business writing
5. **Wedge Strategy**: Start with investor comms, expand to all corporate communications
6. **Speed**: Minutes from thought to polished document
7. **Secure Isolation**: Per-founder persistent workspaces ensure complete confidentiality

## Current Implementation Status

### Completed (MVP)
- ✅ Web-based task interface for founder input
- ✅ Inngest event-driven processing pipeline
- ✅ Claude Code integration in Daytona sandboxes
- ✅ Real-time file detection and display
- ✅ Three-layer caching architecture (backend, frontend, sandbox)
- ✅ Structured knowledge filesystem in `/home/omni/`

### In Progress
- 🔄 Workspace-as-a-Service persistence layer (sandboxes survive server restart)
- 🔄 File synchronization for workspace recovery
- 🔄 Founder-specific UI customization

### Planned (Next Sprint)
- 📋 Authentication system
- 📋 Multi-user production deployment

## Future Enhancements

### Phase 2
- **Fundraising pipeline integration**: Connect with CRM tools like Airtable, Notion
- **Investor portal**: Branded portal for sharing updates and materials
- **Team collaboration**: Allow team members to contribute input for founder materials
- **Advanced analytics**: Track investor engagement and document performance

### Phase 3  
- **Deal room automation**: Auto-populate data rooms with generated materials
- **Investor matching**: Connect founders with relevant investors based on materials
- **Multi-round support**: Track fundraising progress across seed, Series A, B, etc.
- **Enterprise features**: Multi-founder teams, investor relations management

---

This specification serves as the product north star for all implementation decisions.
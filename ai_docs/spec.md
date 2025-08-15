# Project Omni — Product Specification

## Elevator Pitch

Founders spend precious hours writing investor updates and memos that determine their company's future. Omni turns their raw thoughts into investor-ready materials in minutes—memos, updates, and fundraising documents that actually close deals.

## Core Value Proposition

**From founder brain dump to investor-ready materials that close deals**

Transform scattered founder thoughts about metrics, challenges, wins, and plans into polished investor-grade documents that actually get funded.

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

## Architecture

### Three-Tier System

1. **Frontend**: Expo (React Native) mobile app for founder-focused experience
2. **Backend**: Bun server orchestrating Daytona sandboxes via REST + WebSocket
3. **Processing**: Claude Code execution in isolated Daytona sandboxes

### Sandbox Knowledge Structure

```
/home/daytona/workspace/
├── context/
│   ├── entities/companies/       # Company profiles and data
│   ├── entities/people/          # Contact information and relationships
│   ├── projects/                 # Project status and details
│   └── intelligence/             # Insights and patterns
├── decisions/
│   ├── pending/                  # Decisions requiring action
│   └── completed/                # Historical decisions with outcomes
├── commitments/
│   ├── external/                 # Promises to others
│   └── internal/                 # Internal commitments
├── documents/                    # Source materials and references
├── analysis/                     # Generated insights and reports
├── deliverables/                 # Investor-ready materials
│   ├── investor-updates/         # Monthly/quarterly progress reports
│   ├── investment-memos/         # Fundraising documents
│   ├── pitch-narratives/         # Story frameworks for presentations
│   ├── due-diligence/           # Structured investor Q&A responses
│   └── board-materials/          # Executive summaries and strategic docs
├── .system/
│   ├── index/                    # JSON indexes for fast search
│   ├── prompts/                  # Template prompts
│   └── logs/                     # System logs
└── .profile/                     # User writing style analysis
```

## Key Design Principles

### "Knowledge as Code"
- Structured, executable intelligence
- Every file contributes to understanding business context
- Filesystem IS the working memory

### Investor-Ready Materials Focus  
- Create documents that actually close deals, not just organized notes
- Materials should be immediately shareable with investors
- Apply investor communication best practices and proven frameworks

### Style Consistency
- Learn and apply founder's communication style
- Maintain professional presentation standards
- Adapt tone and format to context

### Privacy & Security
- Per-user sandbox isolation
- No data mixing between founders
- Secure API key handling

## Technical Implementation

### Backend (Bun + TypeScript)
- Lightweight Bun server with Effect for async composition
- Daytona SDK integration for sandbox management
- WebSocket streaming for real-time feedback
- RESTful API for client interactions

### Processing (Claude Code in Sandboxes)
- Isolated Daytona sandboxes per user
- Pre-built snapshots with Claude Code 1.0.80
- VibeKit execution patterns for reliability
- Structured filesystem for knowledge persistence

### Frontend (Planned - Expo)
- Mobile-first founder experience
- Real-time streaming of processing results
- Search and browse knowledge base
- Create and review deliverables

## Success Metrics

### Product Metrics
- **Time from brain dump to investor-ready material** (<2 minutes)
- **Fundraising success rate** of users vs. general population  
- **Investor engagement** with generated materials (opens, responses)
- **Material usage rate** (founder actually sends/presents the output)
- **Deal velocity** improvement for fundraising users

### Technical Metrics
- Sandbox creation speed (<3 seconds)
- Claude execution reliability (>99.5%)
- Mobile app responsiveness (<100ms UI updates) 
- Cost per processing request (<$0.10)
- WebSocket streaming latency (<100ms)

## Competitive Advantages

1. **Investor-Communication Focused**: Built specifically for fundraising and investor relations
2. **Deal-Closing Materials**: Creates documents that actually get funded, not just organized notes
3. **Fundraising Expertise**: Applies proven investor communication frameworks and best practices
4. **Speed to Market**: Minutes from brain dump to investor-ready material
5. **Mobile-First**: Perfect for founders who need to update investors on the go
6. **Secure Isolation**: Per-founder sandboxes ensure complete confidentiality of sensitive fundraising data

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

This specification serves as the product north star for all implementation decisions.
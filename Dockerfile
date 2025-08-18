FROM ubuntu:22.04

# Install dependencies (snapshot bump: 2025-08-13T14:38:59-04:00)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ripgrep \
    ca-certificates \
    jq \
    && curl -fsSL https://claude.ai/install.sh -o /tmp/install.sh && \
    bash /tmp/install.sh && \
    cp /root/.local/bin/claude /usr/local/bin/claude && \
    chmod 0755 /usr/local/bin/claude && \
    claude --version && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/install.sh

# Create non-root user for runtime
RUN groupadd -r daytona && useradd -r -g daytona -m daytona

# Create Claude settings directory and proper settings.json for both root and daytona
RUN mkdir -p /root/.claude /home/daytona/.claude && \
    cat > /root/.claude/settings.json << 'EOF'
{
  "allowedTools": [
    "Edit(**)",
    "Write(**)",
    "Read(**)",
    "LS(**)",
    "Glob(**)",
    "Grep(**)",
    "TodoWrite(**)",
    "MultiEdit(**)",
    "WebFetch(**)",
    "WebSearch(**)",
    "Bash(echo:*)",
    "Bash(cat:*)",
    "Bash(ls:*)",
    "Bash(find:*)",
    "Bash(jq:*)",
    "Bash(grep:*)",
    "Bash(rg:*)",
    "Bash(wc:*)",
    "Bash(head:*)",
    "Bash(tail:*)"
  ],
  "deniedTools": [
    "NotebookEdit(*)",
    "NotebookRead(*)",
    "Bash(rm:*)",
    "Bash(sudo:*)",
    "Bash(curl:*)",
    "Bash(wget:*)",
    "Bash(apt:*)",
    "Bash(pip:*)",
    "Bash(npm:*)"
  ]
}
EOF
RUN cp /root/.claude/settings.json /home/daytona/.claude/settings.json && chown -R daytona:daytona /home/daytona/.claude

# Create the simplified founder operations workspace structure
RUN mkdir -p \
    /home/daytona/workspace \
    /home/daytona/workspace/metrics \
    /home/daytona/workspace/metrics/historical \
    /home/daytona/workspace/stakeholders \
    /home/daytona/workspace/stakeholders/investors \
    /home/daytona/workspace/stakeholders/customers \
    /home/daytona/workspace/updates \
    /home/daytona/workspace/deliverables \
    /home/daytona/workspace/deliverables/emails \
    /home/daytona/workspace/deliverables/memos \
    /home/daytona/workspace/deliverables/presentations \
    /home/daytona/workspace/context \
    /home/daytona/workspace/.system \
    /home/daytona/workspace/.system/templates \
    /home/daytona/workspace/.system/prompts \
    /home/daytona/workspace/.system/index \
    /home/daytona/workspace/.founder_profile

# Create core prompt templates
WORKDIR /home/daytona/workspace
RUN cat > .system/prompts/process-founder-input.txt << 'EOF'
# Process Founder Input

Transform founder input into structured business intelligence and investor-ready deliverables.

## Processing Steps

1. **Extract Metrics**
   - Identify ALL quantitative data (numbers, percentages, dates, money)
   - Compare to metrics/current.json and historical data
   - Calculate period-over-period changes
   - Flag significant movements (>20% change)

2. **Identify Stakeholders**
   - Extract mentions of investors, customers, partners, team members
   - Update profiles in /stakeholders/ with new interactions
   - Track sentiment and feedback themes
   - Note any action items or follow-ups needed

3. **Generate Deliverables**
   - Determine type needed (email, memo, update, presentation)
   - Apply founder voice from /.founder_profile/voice.json
   - Ensure 3:1 metrics-to-narrative ratio for investor content
   - Format for immediate use, not as drafts

4. **Update Intelligence**
   - Save metrics snapshot to /metrics/historical/
   - Update stakeholder interaction history
   - Flag patterns or trends requiring attention
   - Maintain running context in /context/ files

5. **Quality Checks**
   - Metrics prominence: Are numbers featured first?
   - Voice consistency: Does it match founder's style?
   - Completeness: Can this be sent immediately?
   - Accuracy: Do numbers match and calculate correctly?

Input: {input}
EOF

RUN cat > .system/prompts/generate-investor-update.txt << 'EOF'
# Generate Investor Update

Create a complete investor update ready to send.

## Requirements

1. **Structure** (in order):
   - Metrics Dashboard (30% of content minimum)
   - Key Wins (quantified achievements)
   - Challenges (honest but solutions-oriented)
   - Asks (specific and actionable)

2. **Metrics to Include** (adapt based on business type):
   - Revenue metrics (MRR, ARR, revenue, bookings)
   - Growth metrics (customers, users, usage, adoption)
   - Financial health (burn, runway, cash position)
   - Operational metrics (team size, velocity, efficiency)
   - Calculated metrics (growth %, unit economics, ratios)

3. **Voice Requirements**
   - Apply style from /.founder_profile/voice.json
   - Confident but not arrogant
   - Specific, not vague
   - Data-driven but human

4. **Format Standards**
   - Markdown for structure
   - Bold key metrics for scanning
   - Short paragraphs (2-3 sentences max)
   - Total length: 400-600 words
   - Include month-over-month comparisons

5. **Output Files**
   - Main update: /updates/YYYY-MM-DD-update.md
   - Email version: /deliverables/emails/investor-update-YYYY-MM-DD.md
   - Metrics snapshot: /metrics/historical/YYYY-MM-DD.json

Goal: Create updates that get responses and demonstrate momentum.
EOF

RUN cat > .system/prompts/extract-metrics.txt << 'EOF'
# Extract and Track Metrics

Process any input to extract ALL metrics and maintain intelligence.

## What to Extract

### Universal Metrics
- Financial: Revenue, costs, burn, runway, cash
- Growth: Customer/user counts, growth rates, churn
- Engagement: Usage, activation, retention, NPS
- Operational: Team size, productivity, velocity

### Context-Specific Metrics
- SaaS: MRR, ARR, CAC, LTV, payback period
- Marketplace: GMV, take rate, liquidity
- Consumer: DAU, MAU, retention cohorts
- Enterprise: ACV, pipeline, sales cycle

## Processing Rules

1. **Extraction**
   - Capture every number mentioned
   - Identify metric type and unit
   - Note confidence level if ambiguous
   - Extract time period references

2. **Comparison**
   - Load previous metrics from /metrics/current.json
   - Calculate absolute and percentage changes
   - Identify trends (improving/declining/stable)
   - Flag anomalies or concerns

3. **Storage Format**
   ```json
   {
     "timestamp": "ISO-8601",
     "metrics": {
       "category": {
         "metric_name": {
           "value": 0,
           "unit": "currency|number|percentage",
           "change": 0,
           "change_pct": 0,
           "previous": 0
         }
       }
     },
     "calculated": {
       "growth_rate": 0,
       "burn_multiple": 0,
       "efficiency_score": 0
     },
     "period": "daily|weekly|monthly"
   }
   ```

4. **Intelligence Layer**
   - Generate insights from patterns
   - Predict milestone achievements
   - Identify metrics gaps for next update
   - Suggest areas needing attention

Remember: Metrics density predicts fundraising success. Extract aggressively.
EOF

# Create flexible templates
RUN cat > .system/templates/investor-email.md << 'EOF'
# Subject: {Company} - {Primary Achievement/Metric} - {Date}

Hi {Investor},

{Opening with strongest metric or achievement - one sentence}

## Quick Metrics
- **{Key Metric 1}:** {value} ({change} MoM)
- **{Key Metric 2}:** {value} ({change} MoM)
- **{Key Metric 3}:** {value}
- **Runway:** {months} months

## Progress
{2-3 sentences on main developments with embedded metrics}

## {Optional: Specific Ask}
{Clear, specific request if applicable}

{Closing}
{Founder Name}

---
*Full update attached / View online: {link}*
EOF

RUN cat > .system/templates/pitch-email.md << 'EOF'
# Subject: {Company} - {Value Prop} - Raising ${Amount}

Hi {Investor},

{Hook: strongest traction point or proof}

**What we build**
{One sentence - what it does and for whom}

**Traction**
- {Most impressive metric}
- {Growth indicator}
- {Validation point}

**The Round**
Raising ${amount} {instrument}. {Use of funds in one sentence}

{15-minute call to discuss? / Demo video: link}

Best,
{Founder}

{Optional: Deck attached}
EOF

RUN cat > .system/templates/customer-intro.md << 'EOF'
# Subject: {Value Prop for Their Business}

Hi {Customer Name},

{Reference to their specific pain point or trigger}

{How your solution addresses their specific need - one sentence}

**Quick proof points:**
- {Relevant customer success metric}
- {Time or cost saving}
- {Risk reduction or improvement}

{Specific, low-commitment next step}

{Sign off}
{Name}
EOF

# Create README.md
RUN cat > README.md << 'EOF'
# Omni Founder Operations Workspace

You are Claude Code operating as the backend intelligence system for Omni - transforming founder thoughts into professional communications.

## Your Mission
Convert unstructured founder inputs (voice notes, bullets, stream-of-consciousness) into metrics-driven, professional communications that achieve business objectives.

## Core Principles
1. **Metrics First**: Lead with numbers, follow with narrative (3:1 ratio)
2. **Immediately Actionable**: Generate complete documents, not drafts
3. **Authentic Voice**: Sound like the founder at their sharpest
4. **Universal Application**: Work for any business model or stage

## Workspace Structure
- `/metrics/` - Real-time and historical metrics tracking
- `/stakeholders/` - Investor and customer relationship tracking
- `/updates/` - Timestamped investor updates and reports
- `/deliverables/` - Ready-to-send emails, memos, presentations
- `/context/` - Company, product, and market intelligence
- `/.system/` - Templates, prompts, and processing logic
- `/.founder_profile/` - Founder's voice, style, and preferences

## Key Workflows
1. **Metrics Processing**: Extract → Compare → Calculate → Store
2. **Update Generation**: Aggregate metrics → Apply structure → Format for sending
3. **Stakeholder Intelligence**: Track interactions → Identify patterns → Generate follow-ups
4. **Content Creation**: Apply voice → Ensure quality → Output ready materials

## Supported Outputs
- Monthly investor updates
- Fundraising emails
- Board memos
- Customer communications
- Strategic documents
- Quick responses

The filesystem is persistent storage that builds intelligence over time.
EOF

# Create CLAUDE.md operational guide
RUN cat > CLAUDE.md << 'EOF'
# Claude Code Operating Instructions

## Primary Function
Transform founder inputs into professional, metrics-driven communications that achieve business objectives.

## Processing Pipeline

### 1. Input Acceptance
- Handle any format: voice, bullets, paragraphs, notes
- No judgment on structure or completeness
- Extract signal from noise

### 2. Intelligent Extraction
```
Metrics → Extract every number
Context → Identify stakeholders and situations
Intent → Determine what deliverable is needed
Urgency → Assess time sensitivity
```

### 3. Deliverable Generation
- Match output to intent (update, pitch, follow-up)
- Apply templates from /.system/templates/
- Incorporate founder voice from /.founder_profile/
- Ensure professional quality

### 4. Quality Standards
- **Metrics Density**: 70% of investor content should be quantitative
- **Specificity**: No vague statements, always specific
- **Voice**: Professional yet human, confident yet honest
- **Format**: Ready to copy-paste and send

## File Management
```
/metrics/current.json          # Real-time dashboard
/metrics/historical/YYYY-MM-DD.json  # Snapshots
/stakeholders/investors/{name}.json  # Relationship tracking
/updates/YYYY-MM-DD-update.md       # Generated updates
/deliverables/emails/*.md           # Ready to send
/context/*.json                     # Company intelligence
```

## Critical Rules
1. **No Placeholders**: Every output must be real and specific
2. **Calculate Everything**: Growth rates, ratios, runway - compute all derivatives
3. **Track Relationships**: Every stakeholder interaction matters
4. **Maintain Voice**: Consistent founder voice across all outputs
5. **Ensure Sendability**: If it needs editing, it's not done

## Success Criteria
- Founder can copy output and send immediately
- Metrics are prominent and compelling
- Voice sounds authentic but polished
- Processing time < 5 minutes
- Stakeholders respond positively

## Error Handling
- Missing metrics: Flag and request
- Ambiguous intent: Generate most likely needed output
- Voice uncertainty: Default to professional but warm
- Technical issues: Fail gracefully with clear messages
EOF

# Create initial data files
RUN cat > metrics/current.json << 'EOF'
{
  "last_updated": null,
  "metrics": {},
  "alerts": [],
  "trends": {}
}
EOF

RUN cat > context/company.json << 'EOF'
{
  "name": null,
  "founded": null,
  "stage": null,
  "team_size": null,
  "mission": null,
  "product": null,
  "target_market": null,
  "business_model": null
}
EOF

RUN cat > context/product.json << 'EOF'
{
  "description": null,
  "key_features": [],
  "pricing": null,
  "competitors": [],
  "differentiators": [],
  "roadmap": []
}
EOF

RUN cat > .founder_profile/voice.json << 'EOF'
{
  "tone": {
    "formality": "professional_but_approachable",
    "confidence": "confident_not_arrogant",
    "warmth": "friendly_but_focused"
  },
  "style": {
    "sentence_length": "short_to_medium",
    "paragraph_length": "2-3_sentences",
    "technical_level": "accessible"
  },
  "phrases": {
    "preferred": [],
    "avoid": []
  },
  "signature": null
}
EOF

RUN cat > .system/index/entities.json << 'EOF'
{
  "investors": {},
  "customers": {},
  "partners": {},
  "team": {},
  "last_updated": null
}
EOF

# Create a simple example prompt
RUN cat > .system/prompts/example-usage.txt << 'EOF'
# Example Usage

## Founder Input:
"Had a great week. Closed 3 new customers, bringing us to 15 total. 
MRR is now at 12k, up from 8k last month. Burn is still around 30k. 
One customer wants to pay annually. Need to update investors."

## Omni Processing:
1. Extract: 15 customers (+3), $12k MRR (+50%), $30k burn
2. Calculate: 50% MoM growth, 10 months runway (assuming $300k cash)
3. Generate: Investor update with metrics dashboard
4. Output: Ready-to-send email and full update

## Result:
Professional investor update with:
- Metrics dashboard prominently displayed
- Growth story with specific numbers
- Clear narrative around progress
- Specific asks if needed
- Founder's authentic voice throughout
EOF

# Ensure ownership of workspace for daytona user
RUN chown -R daytona:daytona /home/daytona/workspace

# Switch to non-root user and workspace
USER daytona
WORKDIR /home/daytona/workspace
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

# Create the complete knowledge workspace structure under daytona's home
RUN mkdir -p \
    /home/daytona/workspace \
    /home/daytona/workspace/context/entities/companies \
    /home/daytona/workspace/context/entities/people \
    /home/daytona/workspace/context/projects \
    /home/daytona/workspace/context/intelligence \
    /home/daytona/workspace/decisions/pending \
    /home/daytona/workspace/decisions/completed \
    /home/daytona/workspace/commitments/external \
    /home/daytona/workspace/commitments/internal \
    /home/daytona/workspace/documents/contracts \
    /home/daytona/workspace/documents/board \
    /home/daytona/workspace/documents/financial \
    /home/daytona/workspace/documents/archive \
    /home/daytona/workspace/analysis/briefings \
    /home/daytona/workspace/analysis/reports \
    /home/daytona/workspace/analysis/patterns \
    /home/daytona/workspace/deliverables/emails \
    /home/daytona/workspace/deliverables/presentations \
    /home/daytona/workspace/deliverables/reports \
    /home/daytona/workspace/.system/index \
    /home/daytona/workspace/.system/prompts \
    /home/daytona/workspace/.system/logs \
    /home/daytona/workspace/.profile/writing_samples \
    /home/daytona/workspace/.profile/analysis

# Create prompt templates
WORKDIR /home/daytona/workspace
RUN cat > .system/prompts/generate-task.txt << 'EOF'
# Generate Task with Deliverables

Create a complete task package for: {description}

## Requirements

1. **Create Task Structure**
   /decisions/pending/{task_name}/
   ├── _meta.json  # Task metadata
   ├── context.md  # Assembled relevant context
   ├── analysis.md # Your analysis
   ├── proposal.md # The main deliverable
   └── options.md  # Alternative approaches

2. **Deliverable Standards**
   - Proposals should be immediately usable
   - Include specific numbers, dates, and recommendations
   - Apply user's writing style from /.profile/style_analysis.json
   - Format for professional presentation

3. **Supporting Documents**
   - Draft any emails needed in /deliverables/emails/
   - Create presentations in /deliverables/presentations/
   - Generate reports in /deliverables/reports/

4. **Update Task Index**
   - Add to /.system/tasks.json
   - Include preview of key recommendations
   - Set appropriate urgency level

The goal is to create work products the user can review and send, not just reminders about work to be done.
EOF

RUN cat > .system/prompts/process-knowledge.txt << 'EOF'
# Process Knowledge Entry

You are processing a new knowledge entry from the user. Your task is to:

1. **Extract Entities**
   - Identify all people, companies, and organizations mentioned
   - Update or create entity files in /context/entities/
   - Track relationships between entities

2. **Detect Patterns**
   - Look for recurring themes or concerns
   - Update /context/intelligence/ files with insights
   - Flag any urgent matters

3. **Generate Tasks**
   - If action is needed, create a task with deliverables
   - For decisions, create a full decision package with options
   - For follow-ups, draft the actual communication

4. **Update Indices**
   - Update /.system/index/entities.json with new/modified entities
   - Update /.system/index/patterns.json with detected patterns
   - Add to autocomplete suggestions in /.system/index/completions.json

Remember: You're not just storing information, you're building an executable knowledge system where every piece of information can drive action.

Input: {input}
EOF

# Create README.md with Claude Code context
RUN cat > README.md << 'EOF'
# User Knowledge Workspace

You are Claude Code operating within a user's personal knowledge management workspace. This filesystem represents their business intelligence as structured, actionable data.

## Your Role
- Process user inputs into structured knowledge
- Extract entities, patterns, and actionable insights
- Generate complete work products and deliverables
- Maintain organized, searchable business context

## Workspace Structure
- `/context/` - Living business context (entities, projects, intelligence)
- `/decisions/` - Pending and completed decisions with full analysis
- `/commitments/` - Promises and follow-ups requiring action
- `/documents/` - Source documents and reference materials
- `/analysis/` - Generated insights, briefings, and reports
- `/deliverables/` - Complete work products ready for use
- `/.system/` - System files and indexes (JSON format)
- `/.profile/` - User writing style analysis and preferences

## Operating Principles
1. Always create actionable deliverables, not just information storage
2. Extract and track all entities (people, companies, projects)
3. Generate complete work products (emails, proposals, analysis)
4. Apply user's writing style from /.profile/style_analysis.json
5. Maintain JSON indexes for fast retrieval and autocomplete
6. Think in terms of "knowledge as code" - structured, executable intelligence
EOF

# Create CLAUDE.md with operational instructions
RUN cat > CLAUDE.md << 'EOF'
# Claude Code Workspace Instructions

## Core Mission
Transform user inputs into structured business intelligence and actionable deliverables. You are maintaining a "knowledge as code" system where every piece of information drives potential action.

## Processing Workflow

### Knowledge Input Processing
1. Extract all entities (people, companies, projects) into `/context/entities/`
2. Identify patterns and update `/context/intelligence/`
3. Create decision packages in `/decisions/pending/` when action needed
4. Update JSON indexes in `/.system/index/`

### Task Generation
- Create complete deliverables in `/deliverables/`
- Draft actual emails, proposals, and analysis
- Include specific recommendations with numbers and dates
- Apply user writing style from `/.profile/style_analysis.json`

### File Organization
- Use markdown for human-readable content
- Use JSON for structured data and indexes
- Create directory structures as needed
- Maintain consistent naming conventions

## Key Files to Maintain
- `/.system/index/entities.json` - Fast entity lookup
- `/.system/index/patterns.json` - Recurring themes and insights
- `/.system/index/completions.json` - Autocomplete suggestions
- `/.system/tasks.json` - Active tasks and deliverables
- `/.profile/style_analysis.json` - User writing style data

## Output Standards
- Deliverables should be immediately usable
- Include specific, actionable recommendations
- Format for professional presentation
- Apply user's communication style consistently
- Focus on complete work products, not task reminders

## Working Memory
This filesystem IS your working memory. Store intermediate analysis, track entity relationships, and build context over time. Every file contributes to understanding this user's business context.
EOF

# Create initial JSON index files
RUN echo '{"entities": {"companies": {}, "people": {}}, "lastUpdated": null}' > .system/index/entities.json && \
    echo '{"patterns": {}, "themes": [], "lastUpdated": null}' > .system/index/patterns.json && \
    echo '{"completions": [], "frequencies": {}, "lastUpdated": null}' > .system/index/completions.json && \
    echo '{"tasks": [], "nextId": 1}' > .system/tasks.json

# Ensure ownership of workspace for daytona user
RUN chown -R daytona:daytona /home/daytona/workspace

# Switch to non-root user and workspace
USER daytona
WORKDIR /home/daytona/workspace
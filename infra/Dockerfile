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
RUN groupadd -r contex && useradd -r -g contex -m contex

# Create Claude settings directory and proper settings.json for both root and contex
RUN mkdir -p /root/.claude /home/contex/.claude && \
    cat > /root/.claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
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
    "deny": [
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
}
EOF
RUN cp /root/.claude/settings.json /home/contex/.claude/settings.json && chown -R contex:contex /home/contex/.claude

# Create the founder operations structure directly in /home/contex
RUN mkdir -p \
    /home/contex/metrics/historical \
    /home/contex/stakeholders/investors \
    /home/contex/stakeholders/customers \
    /home/contex/updates \
    /home/contex/deliverables/emails \
    /home/contex/deliverables/memos \
    /home/contex/deliverables/presentations \
    /home/contex/context \
    /home/contex/founder_profile

# Set working directory before creating files
WORKDIR /home/contex


# Ensure ownership for contex user
RUN chown -R contex:contex /home/contex

# Switch to non-root user
USER contex

# Create all files as contex user to ensure proper ownership
RUN echo "# Contex Backend - Founder Operations System" > README.md && \
    echo "" >> README.md && \
    echo "You are Claude Code operating as the intelligence layer for Contex - transforming founder inputs into investor-ready communications." >> README.md && \
    echo "" >> README.md && \
    echo "## Core Mission" >> README.md && \
    echo "Transform any founder input (voice notes, bullets, stream of consciousness) into structured, metrics-driven deliverables that can be sent immediately." >> README.md && \
    echo "" >> README.md && \
    echo "## Key Principles" >> README.md && \
    echo "1. **Metrics First**: 3:1 ratio of metrics to narrative" >> README.md && \
    echo "2. **Immediately Sendable**: No drafts, only finished documents" >> README.md && \
    echo "3. **Founder Voice**: Authentic but elevated communication" >> README.md && \
    echo "4. **Universal**: Works for any business model or stage" >> README.md

# Create initial JSON files (as contex user)
RUN echo "{" > metrics/current.json && \
    echo "  \"timestamp\": null," >> metrics/current.json && \
    echo "  \"metrics\": {}," >> metrics/current.json && \
    echo "  \"calculated\": {}," >> metrics/current.json && \
    echo "  \"alerts\": []" >> metrics/current.json && \
    echo "}" >> metrics/current.json

RUN echo "{" > context/company.json && \
    echo "  \"name\": \"\"," >> context/company.json && \
    echo "  \"founded\": \"\"," >> context/company.json && \
    echo "  \"stage\": \"\"," >> context/company.json && \
    echo "  \"team_size\": 0," >> context/company.json && \
    echo "  \"mission\": \"\"," >> context/company.json && \
    echo "  \"vision\": \"\"," >> context/company.json && \
    echo "  \"values\": []" >> context/company.json && \
    echo "}" >> context/company.json

RUN echo "{" > context/product.json && \
    echo "  \"name\": \"\"," >> context/product.json && \
    echo "  \"description\": \"\"," >> context/product.json && \
    echo "  \"target_customer\": \"\"," >> context/product.json && \
    echo "  \"key_features\": []," >> context/product.json && \
    echo "  \"roadmap\": []," >> context/product.json && \
    echo "  \"metrics\": {}" >> context/product.json && \
    echo "}" >> context/product.json

RUN echo "{" > context/market.json && \
    echo "  \"size\": \"\"," >> context/market.json && \
    echo "  \"growth_rate\": \"\"," >> context/market.json && \
    echo "  \"competitors\": []," >> context/market.json && \
    echo "  \"positioning\": \"\"," >> context/market.json && \
    echo "  \"trends\": []" >> context/market.json && \
    echo "}" >> context/market.json

RUN echo "{" > context/entities.json && \
    echo "  \"investors\": {}," >> context/entities.json && \
    echo "  \"customers\": {}," >> context/entities.json && \
    echo "  \"team\": {}," >> context/entities.json && \
    echo "  \"last_updated\": null" >> context/entities.json && \
    echo "}" >> context/entities.json

RUN echo "{" > founder_profile/voice.json && \
    echo "  \"tone\": \"professional_but_human\"," >> founder_profile/voice.json && \
    echo "  \"style\": {" >> founder_profile/voice.json && \
    echo "    \"sentence_length\": \"short\"," >> founder_profile/voice.json && \
    echo "    \"technical_level\": \"accessible\"," >> founder_profile/voice.json && \
    echo "    \"personality\": \"confident\"" >> founder_profile/voice.json && \
    echo "  }," >> founder_profile/voice.json && \
    echo "  \"phrases_to_use\": []," >> founder_profile/voice.json && \
    echo "  \"phrases_to_avoid\": [\"crushing it\", \"game-changer\", \"revolutionary\"]," >> founder_profile/voice.json && \
    echo "  \"signature\": \"\"" >> founder_profile/voice.json && \
    echo "}" >> founder_profile/voice.json

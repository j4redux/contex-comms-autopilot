# Create prompt templates
WORKDIR /home/daytona
RUN cat > .system/prompts/process-founder-input.txt << 'EOF'
# Process Founder Input

Transform founder input into structured business intelligence and investor-ready deliverables.

## Processing Steps

1. **Extract Metrics**
   - Identify ALL quantitative data (numbers, percentages, dates, money)
   - Compare to historical metrics in /metrics/historical/
   - Update /metrics/current.json
   - Flag significant changes (>20% movement)

2. **Identify Stakeholders**
   - Parse mentions of investors, customers, team members
   - Update relevant profiles in /stakeholders/
   - Track interaction history and follow-up requirements
   - Note any commitments or promises made

3. **Generate Deliverables**
   - For investor communications: Create in appropriate /deliverables/ folder
   - Apply founder voice from /.founder_profile/voice.json
   - Ensure 3:1 metrics-to-narrative ratio
   - Include specific numbers, dates, and recommendations

4. **Update Context**
   - Capture product updates in /context/product.json
   - Note market intelligence in /context/market.json
   - Update company status in /context/company.json

5. **Quality Checks**
   - Metrics prominence: Are numbers featured prominently?
   - Voice consistency: Does it sound professional yet authentic?
   - Actionability: Can this be sent immediately?
   - Completeness: Are all key metrics included?

Input: {input}
EOF

RUN cat > .system/prompts/generate-investor-update.txt << 'EOF'
# Generate Investor Update

Create a complete investor update ready to send.

## Requirements

1. **Structure** (in order):
   - Metrics Dashboard (30% of content minimum)
   - Key Wins (with quantification)
   - Challenges (honest but forward-looking)
   - Asks (specific and actionable)

2. **Metrics to Include** (adapt based on business type):
   - Revenue metrics (MRR/ARR or equivalent)
   - Customer/User metrics
   - Financial health (burn, runway)
   - Key product/operational metrics
   - Growth rates (calculate automatically)

3. **Voice Requirements**
   - Apply founder's style from /.founder_profile/voice.json
   - Professional but human
   - Confident without arrogance
   - Specific over vague

4. **Format**
   - Use markdown for structure
   - Bold key metrics for scannability
   - Short paragraphs (2-3 sentences max)
   - Total length: 400-600 words

5. **Output Files**
   - Main update: /updates/YYYY-MM-DD-update.md
   - Email version: /deliverables/emails/investor-update-YYYY-MM-DD.md
   - Metrics snapshot: /metrics/historical/YYYY-MM-DD.json

Goal: Create an update that gets responses from investors, not silence.
EOF

RUN cat > .system/prompts/extract-metrics.txt << 'EOF'
# Extract and Track Metrics

Process any input to extract ALL metrics and maintain running intelligence.

## Universal Metrics to Track

1. **Financial Metrics**
   - Revenue (MRR, ARR, GMV, or relevant model)
   - Burn rate and runway
   - Cash position
   - Unit economics (CAC, LTV, margins)

2. **Growth Metrics**
   - User/Customer count
   - Growth rate (calculate if not provided)
   - Retention/Churn
   - Engagement metrics

3. **Operational Metrics**
   - Team size
   - Product metrics (usage, adoption, NPS)
   - Sales pipeline
   - Efficiency metrics

4. **Context-Specific Metrics**
   - Extract ANY number mentioned
   - Infer metric type from context
   - Track even if category unclear

## Processing Rules

1. **Extraction**
   - Pull every number with its context
   - Convert to standard units (K, M for thousands/millions)
   - Note time period (monthly, weekly, total)

2. **Comparison**
   - Load previous metrics from /metrics/current.json
   - Calculate changes and growth rates
   - Flag anomalies or significant movements

3. **Storage Format**
   ```json
   {
     "timestamp": "ISO-8601",
     "metrics": {
       "category": {
         "metric_name": {
           "value": number,
           "unit": "string",
           "change": number,
           "change_pct": number,
           "period": "string"
         }
       }
     },
     "calculated": {
       "growth_rate": number,
       "runway_months": number
     }
   }
   ```

Remember: Investors judge updates by metrics density. When in doubt, extract it.
EOF

# Create templates for common deliverables
RUN cat > .system/templates/investor-email.md << 'EOF'
# Subject: {Company} - {Primary Metric/Win} - {Date}

Hi {Investor},

{Opening with strongest metric or win - one sentence}

## Quick Metrics
- **{Key Metric 1}:** {value} ({change} from last month)
- **{Key Metric 2}:** {value} ({growth rate})
- **{Key Metric 3}:** {value}
- **Runway:** {months} months

## Progress
{2-3 sentences on main developments, metrics embedded naturally}

## Ask
{Specific request if any, or "No asks this month - just keeping you updated"}

{Closing}
{Founder Name}

---
*Full update attached/linked*
EOF

RUN cat > .system/templates/cold-pitch.md << 'EOF'
# Subject: {Company} - {Value Prop} - Raising ${Amount}

Hi {Investor},

{Hook: strongest traction point or metric}

**What we do**
{One sentence - clear value prop for specific customer}

**Traction**
- {Most impressive metric}
- {Growth indicator}
- {Validation point}

**The Round**
Raising ${amount} {instrument}. {Use of funds in one sentence}

**Ask**
{Specific call to action - meeting request or demo offer}

{Attachment note: deck/demo video}

Best,
{Founder}
EOF

RUN cat > .system/templates/customer-feedback-response.md << 'EOF'
# Subject: Re: {Original Subject} - Thank you for your feedback

Hi {Customer},

Thank you for {specific feedback point}. This is exactly the kind of insight that helps us build something truly valuable.

{Acknowledge specific concern or suggestion}

**What we're doing about it:**
{Specific action or timeline}

{If applicable: mention how this fits into broader product vision}

I'll follow up {specific timeline} with an update on this.

Best,
{Founder}
EOF
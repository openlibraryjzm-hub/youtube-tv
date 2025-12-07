# Documentation Maintenance Strategy

This document outlines how to keep documentation synchronized with code changes, new features, and problem resolutions.

## Maintenance Principles

1. **Update docs with code changes** - Documentation should reflect current code state
2. **Document decisions** - Record why changes were made, not just what changed
3. **Link related changes** - Connect code changes to documentation updates
4. **Version awareness** - Track when documentation was last updated
5. **AI-friendly format** - Maintain clear structure for AI parsing
6. **Automated updates** - AI agents should update docs automatically after each change (see Automated Update Strategy below)

## Update Triggers

### When to Update Documentation

#### Code Changes
- ✅ **New functions added** → Update CODE-STRUCTURE.md
- ✅ **New state variables** → Update STATE-MANAGEMENT.md
- ✅ **New patterns introduced** → Update PATTERNS.md
- ✅ **Data flow changes** → Update DATA-FLOW.md
- ✅ **New gotchas discovered** → Update GOTCHAS.md
- ✅ **Architecture changes** → Update MASTER-CONTEXT.md

#### Problem Resolution
- ✅ **Bug fixed** → Update GOTCHAS.md (mark as resolved, add solution)
- ✅ **Performance improved** → Update relevant pattern in PATTERNS.md
- ✅ **New optimization** → Update MASTER-CONTEXT.md recent developments
- ✅ **Workaround implemented** → Document in GOTCHAS.md

#### New Features
- ✅ **Feature added** → Update MASTER-CONTEXT.md features section
- ✅ **UI changes** → Update MASTER-CONTEXT.md UI section
- ✅ **New user flows** → Update DATA-FLOW.md
- ✅ **New state management** → Update STATE-MANAGEMENT.md

#### Challenges/Issues
- ✅ **New challenge identified** → Update MASTER-CONTEXT.md current challenges
- ✅ **Challenge resolved** → Move to recent developments, update solution
- ✅ **New edge case found** → Update GOTCHAS.md

## Update Checklist

When making code changes, check:

### Code Changes
- [ ] Are new functions documented in CODE-STRUCTURE.md?
- [ ] Are new state variables documented in STATE-MANAGEMENT.md?
- [ ] Do new patterns need to be added to PATTERNS.md?
- [ ] Does data flow change? Update DATA-FLOW.md
- [ ] Are there new gotchas? Update GOTCHAS.md

### Problem Resolution
- [ ] Is the problem documented in GOTCHAS.md?
- [ ] Is the solution documented in PATTERNS.md or GOTCHAS.md?
- [ ] Is the fix mentioned in MASTER-CONTEXT.md recent developments?
- [ ] Are cross-references updated?

### New Features
- [ ] Is the feature described in MASTER-CONTEXT.md?
- [ ] Are UI changes documented in MASTER-CONTEXT.md UI section?
- [ ] Is the data flow documented in DATA-FLOW.md?
- [ ] Are new state variables in STATE-MANAGEMENT.md?

## Update Workflow

### Step 1: Make Code Changes
- Write code
- Test functionality
- Commit code changes

### Step 2: Identify Documentation Impact
- Review checklist above
- Identify which docs need updates
- Note specific sections

### Step 3: Update Documentation
- Update relevant documentation files
- Add cross-references if needed
- Update "Last Updated" dates
- Add to recent developments if significant

### Step 4: Verify Cross-References
- Check that new sections have cross-references
- Update existing cross-references if structure changed
- Ensure links still work

### Step 5: Commit Documentation
- Commit documentation with code (or in same PR)
- Use descriptive commit messages
- Reference issue/PR numbers

## Documentation Update Templates

### Adding a New Function

**CODE-STRUCTURE.md:**
```markdown
#### New Function Category
- **functionName():** Brief description
  - Purpose: What it does
  - Parameters: What it takes
  - Returns: What it returns
  - Used By: Where it's called
  - Related: [PATTERNS.md#pattern-name](./PATTERNS.md#pattern-name)
```

**PATTERNS.md (if new pattern):**
```markdown
## X. New Pattern Name

> **Related:** [CODE-STRUCTURE.md#function-name](./CODE-STRUCTURE.md#function-name) - Implementation
> **Related:** [DATA-FLOW.md#flow-name](./DATA-FLOW.md#flow-name) - How it fits

**Purpose:** What problem this solves

**Pattern:**
```javascript
// Code example
```

**Key Points:**
- Point 1
- Point 2
```

### Fixing a Bug

**GOTCHAS.md:**
```markdown
### X. Bug Name (RESOLVED)

> **Status:** ✅ Resolved in [commit/PR]
> **Related:** [PATTERNS.md#fix-pattern](./PATTERNS.md#fix-pattern) - Solution pattern

**Problem:** Description

**Solution:**
- What was changed
- How it was fixed
- Prevention measures added

**Code Location:**
- File: `app/page.jsx`
- Lines: ~XXXX-YYYY
```

**MASTER-CONTEXT.md (Recent Developments):**
```markdown
### X.X Bug Fix (Date)

**Problem:** Brief description
**Solution:** What was done
**Impact:** What this fixes
**Code Changes:** Key files/functions modified
```

### Adding New State

**STATE-MANAGEMENT.md:**
```markdown
#### `newStateVariable` (type)
- **Purpose:** What it's for
- **Initial:** Default value
- **Updates:** How it's updated
- **Used By:** Where it's used
- **Notes:** Any special considerations
- **Related:** [PATTERNS.md#pattern](./PATTERNS.md#pattern) - Related pattern
```

**CODE-STRUCTURE.md:**
```markdown
#### useState Hooks (Lines XXX-YYY)
- `newStateVariable`: Brief description
```

## Version Tracking

### Last Updated Dates

Each document should have:
- **Last Updated:** Date at top
- **Version:** Version number (if using semantic versioning)
- **Recent Changes:** Section listing recent updates

### Change Log Format

Add to end of relevant document:
```markdown
## Change Log

### 2025-01-06
- Added bulk delete feature
- Fixed orphaned ID issue
- Updated title fetching pattern

### 2025-01-05
- Documented API usage optimization
- Added concurrent fetch pattern
```

## AI-Friendly Formatting

### Use Clear Headers
- Use proper markdown hierarchy (##, ###, ####)
- Keep headers descriptive and specific
- Use consistent naming conventions

### Use Code Blocks
- Always use code blocks for code examples
- Specify language when possible (```javascript)
- Include context in comments

### Use Cross-References
- Always link to related sections
- Use descriptive link text
- Keep links up to date

### Use Examples
- Provide concrete examples
- Show before/after when relevant
- Include edge cases

### Use Lists
- Use bullet points for features
- Use numbered lists for steps
- Use checklists for tasks

## Automation Opportunities

### Potential Automation

1. **Function Documentation:**
   - Extract function signatures
   - Generate CODE-STRUCTURE.md entries
   - Update on code changes

2. **State Variable Tracking:**
   - Extract useState/useRef declarations
   - Generate STATE-MANAGEMENT.md entries
   - Track changes over time

3. **Cross-Reference Validation:**
   - Check that all links are valid
   - Verify sections exist
   - Report broken links

4. **Change Detection:**
   - Compare code to documentation
   - Flag undocumented changes
   - Suggest documentation updates

### Manual Process (Current)

For now, use this checklist manually:
1. After code changes, review checklist
2. Update relevant documentation
3. Verify cross-references
4. Commit with code

## Documentation Review Schedule

### Weekly Review
- Check for undocumented code changes
- Verify cross-references still work
- Update recent developments section

### Monthly Review
- Review all documentation for accuracy
- Update outdated sections
- Add missing information
- Remove resolved gotchas (or mark as resolved)

### Major Release Review
- Comprehensive documentation audit
- Update all examples
- Verify all links
- Add new features to overview
- Update architecture diagrams if needed

## Quick Update Guide

### I Added a New Feature
1. Update MASTER-CONTEXT.md (features section)
2. Update CODE-STRUCTURE.md (function location)
3. Update STATE-MANAGEMENT.md (if new state)
4. Update DATA-FLOW.md (if flow changes)
5. Add cross-references
6. **⚠️ Update AI-ONBOARDING-PROMPT.md** (if feature significantly changes project status or adds new documentation)

### I Fixed a Bug
1. Update GOTCHAS.md (mark as resolved)
2. Update PATTERNS.md (if new pattern)
3. Update MASTER-CONTEXT.md (recent developments)
4. Update cross-references

### I Discovered a New Gotcha
1. Add to GOTCHAS.md
2. Link to related patterns
3. Add prevention checklist item
4. Update relevant patterns if needed
5. **⚠️ Update AI-ONBOARDING-PROMPT.md** (if gotcha is critical and changes "Critical Rules")

### I Changed Data Flow
1. Update DATA-FLOW.md (affected flows)
2. Update CODE-STRUCTURE.md (function changes)
3. Update PATTERNS.md (if pattern changes)
4. Update cross-references

## Automated Update Strategy

### AI Agent Auto-Update Protocol

**Goal:** AI agents should automatically update documentation after each code change, rather than requiring manual review.

#### Update Triggers (Automatic)

When an AI agent makes code changes, it should:

1. **After Code Changes:**
   - ✅ Identify which documentation files are affected
   - ✅ Update relevant sections automatically
   - ✅ Add cross-references if new sections created
   - ✅ Update "Last Updated" date
   - ✅ Add entry to change log

2. **After Bug Fixes:**
   - ✅ Update GOTCHAS.md (mark as resolved or add new gotcha)
   - ✅ Update MASTER-CONTEXT.md recent developments
   - ✅ Update PATTERNS.md if new pattern created
   - ✅ Add cross-references

3. **After New Features:**
   - ✅ Update MASTER-CONTEXT.md features section
   - ✅ Update CODE-STRUCTURE.md function list
   - ✅ Update STATE-MANAGEMENT.md if new state
   - ✅ Update DATA-FLOW.md if flow changes
   - ✅ Add to PATTERNS.md if new pattern

4. **After Problem Resolution:**
   - ✅ Move from "Current Challenges" to "Recent Developments"
   - ✅ Document solution
   - ✅ Update related patterns/gotchas
   - ✅ Add cross-references

#### Automated Update Checklist (For AI Agents)

**After ANY code change, check:**

- [ ] Does this add/modify functions? → Update CODE-STRUCTURE.md
- [ ] Does this add/modify state? → Update STATE-MANAGEMENT.md
- [ ] Does this create new pattern? → Update PATTERNS.md
- [ ] Does this fix a gotcha? → Update GOTCHAS.md
- [ ] Does this change data flow? → Update DATA-FLOW.md
- [ ] Does this add/modify features? → Update MASTER-CONTEXT.md
- [ ] Are cross-references needed? → Add links
- [ ] Update "Last Updated" date? → Update header
- [ ] Add to change log? → Add entry
- [ ] **⚠️ Does this create new documentation file? → Update AI-ONBOARDING-PROMPT.md (see Prompt Update Rules below)**

**📋 Check for Completion Signals (Periodically):**

- [ ] Check DOCUMENTATION-GAPS.md for status changes (`Missing` → `✅ Complete`)
- [ ] Check for completed checkboxes in action items
- [ ] Check new documentation files for "Ready for Prompt Update: Yes"
- [ ] Check DOCUMENTATION-STATUS.md if it exists
- [ ] If completion detected, verify documentation exists and is comprehensive
- [ ] Update AI-ONBOARDING-PROMPT.md if documentation is complete
- [ ] Update cross-references in other docs

#### Update Automation Rules

**Rule 1: Always Update Affected Docs**
- Don't wait for review
- Update immediately after code change
- Use templates from this document

**Rule 2: Maintain Cross-References**
- Add links when creating new sections
- Update links when moving/renaming sections
- Verify links still work

**Rule 3: Update Metadata**
- Update "Last Updated" date
- Add to change log
- Update version if major change

**Rule 4: Use Templates**
- Use templates from this document
- Follow existing format
- Maintain consistency

#### Example: Automated Update After Code Change

**Scenario:** AI adds a new function `handleNewFeature()`

**Automatic Updates:**

1. **CODE-STRUCTURE.md:**
   ```markdown
   #### New Feature Functions
   - **handleNewFeature():** Brief description
     - Purpose: What it does
     - Parameters: What it takes
     - Returns: What it returns
     - Used By: Where it's called
     - Related: [PATTERNS.md#pattern-name](./PATTERNS.md#pattern-name)
   ```

2. **MASTER-CONTEXT.md (if significant feature):**
   ```markdown
   ### X.X New Feature (2025-01-06)
   - Added handleNewFeature() function
   - Purpose: [description]
   - Impact: [what this enables]
   ```

3. **Change Log:**
   ```markdown
   ### 2025-01-06
   - Added handleNewFeature() function
   - Updated CODE-STRUCTURE.md
   ```

#### Automated Update Workflow

```
AI Makes Code Change
  ↓
AI Identifies Affected Docs
  ↓
AI Updates Each Doc (using templates)
  ↓
AI Adds Cross-References
  ↓
AI Updates Metadata (dates, versions)
  ↓
AI Commits Docs with Code
```

#### Update Frequency

- **Immediate:** After each code change (automated)
- **Session End:** Review all updates made in session
- **Weekly:** Comprehensive review (manual)
- **Monthly:** Full documentation audit (manual)

#### Validation

After automated updates, AI should:
- Verify cross-references are valid
- Check that all affected docs were updated
- Ensure format consistency
- Confirm metadata updated

## Manual Review Process

While updates are automated, periodic manual review is still valuable:

### Weekly Review
- Verify automated updates are correct
- Check for missing updates
- Review cross-references
- Update recent developments section

### Monthly Review
- Comprehensive documentation audit
- Remove resolved gotchas (or mark as resolved)
- Update outdated sections
- Add missing information

## Maintenance Commands

### Check Documentation Status
```bash
# Find all markdown files
find . -name "*.md" -type f

# Check for broken internal links (manual review)
grep -r "\[.*\](" *.md
```

### Update Last Modified Dates
```bash
# Update date in all docs (manual)
# Search for "Last Updated:" and update dates
```

### Validate Cross-References
```bash
# Check that all linked sections exist (manual)
# Review each cross-reference
```

## Best Practices

1. **Update as you go** - Don't let docs get stale
2. **Automate updates** - AI agents should update docs automatically after each change
3. **Link everything** - Cross-references help AI understand
4. **Be specific** - Include line numbers, function names, examples
5. **Show, don't tell** - Use code examples
6. **Keep it current** - Outdated docs are worse than no docs
7. **Review periodically** - Automated updates + periodic manual review

## Automated vs Manual Updates

### Automated Updates (AI Agents)
- **When:** After each code change
- **Who:** AI agent making the change
- **What:** Update affected documentation files
- **How:** Use templates and checklists in this document
- **Validation:** Verify updates are correct

### Manual Reviews
- **When:** Weekly/monthly
- **Who:** Developer/AI agent
- **What:** Review automated updates, catch missed items
- **How:** Review checklist, verify accuracy
- **Purpose:** Quality assurance, catch edge cases

---

## ⚠️ CRITICAL: AI-ONBOARDING-PROMPT.md Update Rules

**The master prompt (AI-ONBOARDING-PROMPT.md) should ONLY be updated when new documentation is actually created and available. Do NOT reference documentation that doesn't exist yet.**

### When to Update the Prompt

#### ✅ Update Prompt When:
1. **New Documentation File Created:**
   - Screenshots directory created → Add screenshot references
   - API-REFERENCE.md created → Add to reading list
   - FIREBASE-PATTERNS.md created → Add to reading list
   - SETUP.md created → Add to reading list
   - Any comprehensive new doc → Add if significant

2. **Major Documentation Updates:**
   - New major feature fully documented → Update "Current Challenges"
   - Major architecture change documented → Update "Key Principles"
   - New critical pattern documented → Update "Critical Rules"
   - Project status significantly changes → Update "Project Status"

3. **Screenshot Documentation Complete:**
   - SCREENSHOTS/ directory exists with screenshots
   - SCREENSHOTS/README.md created
   - Screenshots referenced in MASTER-CONTEXT.md
   - ✅ **NOW update prompt** to reference screenshots

#### ❌ Do NOT Update Prompt When:
- Documentation is planned but not created
- Documentation is partially complete
- Documentation is mentioned but doesn't exist
- Only ideas/plans exist, no actual documentation

### Prompt Update Checklist

When new documentation is added:
- [ ] Is the new documentation comprehensive and complete?
- [ ] Does it add significant value to understanding?
- [ ] Should it be in the reading list?
- [ ] Should it be referenced in "Key Principles"?
- [ ] Should it be referenced in "Critical Rules"?
- [ ] Update "Project Status" if relevant?
- [ ] Add cross-reference from new doc to prompt?

### Example: Screenshot Update Process

**Current State (Screenshots don't exist):**
- ❌ Prompt should NOT mention screenshots
- ❌ Prompt should NOT reference SCREENSHOTS/ directory
- ✅ DOCUMENTATION-GAPS.md mentions screenshots as missing (this is OK)

**After Screenshots Added:**
1. Create SCREENSHOTS/ directory with screenshots
2. Create SCREENSHOTS/README.md
3. Update MASTER-CONTEXT.md with screenshot links
4. ✅ **NOW update AI-ONBOARDING-PROMPT.md:**
   - Add: "Screenshots available in SCREENSHOTS/ directory - see MASTER-CONTEXT.md Section 3"
   - Update "Project Status" if screenshots complete major gap
   - Add screenshot reference in UI understanding section

### Prompt Update Template

When adding new documentation to prompt:

```markdown
**CRITICAL: Read all attached documentation files in this order:**

1. README-DOCUMENTATION.md
2. AI-QUICK-START.md
3. MASTER-CONTEXT.md
...
X. NEW-DOCUMENTATION.md - [Description] (ONLY if comprehensive and complete)
```

**Key Rule:** Only add to prompt if documentation is:
- ✅ Actually created (file exists)
- ✅ Comprehensive (not partial)
- ✅ Adds significant value
- ✅ Referenced in other docs

## Documentation Ownership

- **Primary Maintainer:** Development team
- **Review Process:** Review docs with code reviews
- **Update Responsibility:** Developer making changes
- **Quality Check:** Before major releases

---

**Remember:** Good documentation is a living document. Keep it updated, and it will serve you well.

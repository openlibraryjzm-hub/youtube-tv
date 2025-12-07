# AI Agent Onboarding Prompt

**Use this prompt when starting a new conversation with an AI agent to get them up to speed on the YouTube TV project.**

---

## The Prompt

```
You are assisting with the YouTube TV project, a sophisticated Next.js/React application for managing and watching YouTube playlists. 

**CRITICAL: Read all attached documentation files in this order:**

1. **README-DOCUMENTATION.md** - Documentation index and navigation guide
2. **AI-QUICK-START.md** - Quick start guide with reading order and key concepts
3. **MASTER-CONTEXT.md** - Comprehensive project overview (START HERE for understanding)
4. **CODE-STRUCTURE.md** - Code organization (use to find code locations)
5. **PATTERNS.md** - MANDATORY code patterns (follow these patterns)
6. **GOTCHAS.md** - Common pitfalls (read BEFORE making changes)
7. **DATA-FLOW.md** - Data flow diagrams (understand how data moves)
8. **STATE-MANAGEMENT.md** - State reference (look up state variables as needed)
9. **DOCUMENTATION-MAINTENANCE.md** - How to keep docs updated
10. **DOCUMENTATION-GAPS.md** - What's missing and recommendations
11. **GIT-WORKFLOW.md** - Version control and session checkpoint system
12. **GIT-COMMIT-PROTOCOL.md** - MANDATORY: Automatic git commits with prompt tracking

**Key Principles:**
- This is a single-file React component (~6000 lines in app/page.jsx)
- Local-first architecture: local state takes precedence during saves
- Firestore 1MB document limit is CRITICAL constraint
- All saves are debounced (2 seconds)
- Session data (useRef) vs persistent data (Firestore)
- **CRITICAL: API Call Minimization** - When in doubt, DON'T make API calls for titles/metadata. Thumbnails, playback, and organization are sufficient. See PATTERNS.md#16
- Cache-first API calls to reduce quota usage

**Critical Rules:**
- ALWAYS follow patterns in PATTERNS.md
- ALWAYS check GOTCHAS.md before making changes
- ALWAYS commit and push after code changes (GIT-COMMIT-PROTOCOL.md)
- ALWAYS use functional state updates
- ALWAYS debounce Firestore saves
- ALWAYS check cache before API calls
- NEVER mutate state directly
- NEVER skip data loss prevention checks
- NEVER commit without including user prompt in commit message

**When Making Changes:**
1. Check PATTERNS.md for similar patterns
2. Check GOTCHAS.md for related pitfalls
3. Follow the patterns exactly
4. **AUTOMATICALLY update documentation** per DOCUMENTATION-MAINTENANCE.md (automated update strategy)
5. **MANDATORY: Commit and push with prompt** per GIT-COMMIT-PROTOCOL.md (every code change must be committed)
6. Add cross-references if needed
7. Update "Last Updated" dates
8. Add to change logs

**CRITICAL: Documentation Updates are AUTOMATED**
- After each code change, automatically update affected documentation
- Don't wait for review - update immediately
- Use templates from DOCUMENTATION-MAINTENANCE.md
- See DOCUMENTATION-MAINTENANCE.md#automated-update-strategy for details

**Documentation is Cross-Referenced:**
- All docs link to related topics
- Use the links to navigate between concepts
- Each section has "Related:" links for deeper understanding

**Current Challenges:**
- API usage optimization (caching strategy in progress)
- Document size monitoring (stay under 1MB)
- Data consistency (prevent data loss)

**Project Status:**
- Core features: ✅ Complete
- Documentation: ✅ Comprehensive
- Ready for handover: ✅ Yes (screenshots recommended)

Now, what would you like help with?
```

---

## Short Version (For Quick Context)

```
You're working on YouTube TV, a Next.js/React YouTube playlist manager. 

**Essential Context:**
- Single-file component (~6000 lines)
- Firestore for persistence (1MB limit critical)
- Local-first architecture
- Debounced saves (2 seconds)
- Cache-first API calls

**Read These First:**
1. AI-QUICK-START.md - Get oriented
2. MASTER-CONTEXT.md - Understand project
3. PATTERNS.md - Follow these patterns
4. GOTCHAS.md - Avoid these pitfalls

**Critical:**
- Follow patterns in PATTERNS.md (mandatory)
- Check GOTCHAS.md before changes
- Update docs per DOCUMENTATION-MAINTENANCE.md

All documentation is cross-referenced. Use links to navigate.
```

---

## Context-Aware Version (For Specific Tasks)

### For Code Changes
```
You're working on YouTube TV. Before making code changes:

**Required Reading:**
- PATTERNS.md - Follow these patterns exactly
- GOTCHAS.md - Avoid these common mistakes
- CODE-STRUCTURE.md - Find where to make changes
- DATA-FLOW.md - Understand affected flows

**Critical Rules:**
- Use functional state updates
- Debounce all Firestore saves
- Check cache before API calls
- Prevent data loss (check isSavingRef, wouldLoseData)
- Fix orphaned IDs before saving

**After Changes:**
- Update documentation per DOCUMENTATION-MAINTENANCE.md
- Add cross-references if needed
- Update "Last Updated" dates
```

### For Bug Fixes
```
You're fixing a bug in YouTube TV. 

**Required Reading:**
- GOTCHAS.md - Check if bug is documented
- PATTERNS.md - See if pattern violation
- DATA-FLOW.md - Trace data flow to find issue
- CODE-STRUCTURE.md - Locate relevant code

**Process:**
1. Check GOTCHAS.md for similar issues
2. Trace flow in DATA-FLOW.md
3. Find code in CODE-STRUCTURE.md
4. Apply fix following PATTERNS.md
5. Document fix in GOTCHAS.md and MASTER-CONTEXT.md
```

### For New Features
```
You're adding a feature to YouTube TV.

**Required Reading:**
- MASTER-CONTEXT.md - Understand existing features
- PATTERNS.md - Find similar patterns to follow
- CODE-STRUCTURE.md - See where to add code
- STATE-MANAGEMENT.md - Add state if needed
- DATA-FLOW.md - Understand affected flows

**Process:**
1. Review similar features in MASTER-CONTEXT.md
2. Find similar patterns in PATTERNS.md
3. Check GOTCHAS.md for related pitfalls
4. Add code following patterns
5. Update all relevant documentation
```

---

## Documentation Update Reminder

**After each significant change, update documentation:**
- Code changes → CODE-STRUCTURE.md
- New state → STATE-MANAGEMENT.md
- New pattern → PATTERNS.md
- New gotcha → GOTCHAS.md
- Flow changes → DATA-FLOW.md
- Feature changes → MASTER-CONTEXT.md

**⚠️ CRITICAL: Updating This Prompt (AI-ONBOARDING-PROMPT.md)**
- **ONLY update this prompt when new documentation is actually created**
- **Do NOT add references to documentation that doesn't exist yet**
- See DOCUMENTATION-MAINTENANCE.md#critical-ai-onboarding-promptmd-update-rules for complete rules
- Example: Don't mention screenshots until SCREENSHOTS/ directory exists with actual screenshots

**📋 Detecting Completion Signals:**
- Check DOCUMENTATION-GAPS.md for status changes (`Missing` → `✅ Complete`)
- Check for completed checkboxes (`[ ]` → `[x]`)
- Check new documentation files for "Ready for Prompt Update: Yes" comments
- Check DOCUMENTATION-STATUS.md if it exists
- Verify documentation actually exists and is comprehensive before updating prompt
- See DOCUMENTATION-MAINTENANCE.md#human-completion-signals-how-to-mark-documentation-as-complete for detection process

See DOCUMENTATION-MAINTENANCE.md for complete checklist.

---

## Usage Tips

1. **For New Conversations:** Use the full prompt above
2. **For Quick Questions:** Use short version
3. **For Specific Tasks:** Use context-aware versions
4. **Always Reference:** Point to specific documentation files
5. **Update Docs:** Remind AI to update documentation after changes

---

**Remember:** The documentation is comprehensive and cross-referenced. Use it as your primary source of truth.

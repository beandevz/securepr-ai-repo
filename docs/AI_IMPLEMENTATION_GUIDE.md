# AI Implementation Guide

Guide for using Claude Code and GitHub Copilot for collaborative development on SecurePR AI.

## 🤖 Overview

This guide helps your team use AI assistants effectively to implement features, fix bugs, and refactor code while maintaining quality and consistency.

## 🎯 Claude Code Integration

### Setting Up Claude Code

1. **Install Claude Code**:
   - Desktop: Download from claude.ai/code
   - VS Code: Install Claude Code extension
   - CLI: `npm install -g @anthropic-ai/claude-code`

2. **Configure Project**:
   ```bash
   cd securepr-ai-repo
   # Claude Code automatically detects CLAUDE.md
   ```

3. **Project Memory**:
   - Location: `.claude/memory/`
   - Contains project-specific context
   - Helps Claude understand architecture

### Task Templates for Claude

#### Template 1: Implement New Security Rule

```
Task: Implement detection rule for [VULNERABILITY_TYPE]

Context:
- Location: backend/app/services/rule_engine.py
- Pattern: Add to SECRET_PATTERNS list
- Return: Finding objects with OWASP mapping

Requirements:
1. Add regex pattern to detect [PATTERN]
2. Create Finding with severity [SEVERITY]
3. Include recommendation text
4. Add test in tests/test_rule_engine.py

Reference CLAUDE.md sections:
- Skill A: Security analysis
- Pattern: Strategy pattern for analyzers

Please implement following our clean code guidelines.
```

#### Template 2: Add New API Endpoint

```
Task: Add API endpoint for [FEATURE]

Context:
- Location: backend/app/api/routes/
- Pattern: Follow existing route structure
- Use service layer pattern

Requirements:
1. Create route in appropriate file
2. Extract business logic to services/
3. Add request/response models to domain/schemas.py
4. Follow security guidelines (input validation)
5. Add integration test

Reference: docs/API.md for endpoint patterns
```

#### Template 3: Frontend Component

```
Task: Create [COMPONENT_NAME] component

Context:
- Location: frontend/src/ui/components/
- Pattern: Functional component with TypeScript
- Extract business logic to utils/hooks

Requirements:
1. Component < 200 lines
2. Props interface exported
3. Extract helpers to utils/
4. Add to index.tsx exports
5. Follow accessibility guidelines

Reference:
- frontend/src/ui/components/SplitDiffViewer/ for example
- Existing component patterns
```

### Best Practices with Claude

**DO**:
✅ Provide clear context from CLAUDE.md
✅ Reference existing patterns in codebase
✅ Ask Claude to explain before implementing
✅ Request tests alongside code
✅ Use specific file paths
✅ Point to similar implementations

**DON'T**:
❌ Ask for complete rewrites without context
❌ Skip test requirements
❌ Ignore architectural patterns
❌ Accept code without reviewing
❌ Skip type hints/interfaces

### Example Claude Prompts

**Add Feature**:
```
Read backend/app/services/pipeline.py. I need to add a feature to export findings as SARIF format. Follow the existing pattern of format_summary() in utils/formatters.py. Create a new function format_sarif() that converts Finding objects to SARIF JSON schema. Include type hints and docstrings.
```

**Debug Issue**:
```
I'm getting a "Connection refused" error when the worker tries to connect to Azure Service Bus. Check backend/app/queue/manager.py and app/queue/servicebus_queue.py. Look for configuration issues and suggest fixes. Check the connection string format.
```

**Refactor Code**:
```
The function process_job() in backend/app/services/pipeline.py is 138 lines. Following our Task #12 plan to refactor into Pipeline pattern stages, help me break this into:
- fetch_diff stage
- analyze stage
- aggregate stage
- publish stage

Create the directory structure and stage classes with proper interfaces.
```

## 🔮 GitHub Copilot Integration

### Setup

1. **Install Copilot**:
   - VS Code: Install GitHub Copilot extension
   - JetBrains: Install GitHub Copilot plugin

2. **Configure**:
   - Settings → GitHub Copilot → Enable
   - Set Python interpreter to project venv
   - Set Node version for frontend

### Effective Copilot Usage

#### Writing Functions

**Trigger**: Write function signature + docstring

```python
def extract_severity_from_findings(findings: List[Finding]) -> Dict[str, int]:
    """
    Extract severity counts from findings.
    
    Args:
        findings: List of Finding objects
        
    Returns:
        Dictionary mapping severity levels to counts
    """
    # Copilot will suggest implementation
```

#### Writing Tests

**Trigger**: Start test function with clear name

```python
def test_severity_comparison_with_critical_findings():
    """Test that CRITICAL severity ranks highest."""
    # Copilot suggests test implementation
```

#### Type Definitions

**Trigger**: Start interface/type with clear name

```typescript
interface SecurityFindingProps {
  // Copilot suggests properties based on project context
```

### Copilot Best Practices

**DO**:
✅ Write clear docstrings/comments
✅ Use descriptive function names
✅ Review all suggestions carefully
✅ Reject unsafe patterns (SQL injection, etc.)
✅ Use Tab to accept, Arrow keys to cycle

**DON'T**:
❌ Accept suggestions blindly
❌ Skip security review
❌ Ignore type errors
❌ Accept hardcoded secrets
❌ Skip testing generated code

## 📋 Team Collaboration with AI

### Workflow

1. **Task Assignment**: Use GitHub Issues with AI-friendly descriptions
2. **Context Sharing**: Reference relevant files in issue description
3. **AI-Assisted Implementation**: Use Claude/Copilot for coding
4. **Human Review**: Team reviews AI-generated code in PR
5. **Testing**: Run automated tests + manual verification
6. **Documentation**: Update docs with any new patterns

### GitHub Issue Template for AI

```markdown
## Task Description
[Clear description of what needs to be implemented]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests added
- [ ] Documentation updated

## Context
- Related files: `path/to/file.py`, `path/to/component.tsx`
- Pattern to follow: [Link to similar implementation]
- CLAUDE.md reference: Skill A

## AI Assistant Prompt
```
[Pre-written prompt for Claude Code or instructions for Copilot]
```

## Testing Instructions
[How to verify the implementation works]
```

### Code Review Checklist (Human + AI)

When reviewing AI-generated code:

- [ ] **Security**: No injection vulnerabilities
- [ ] **Types**: All type hints/interfaces present
- [ ] **Tests**: Adequate test coverage
- [ ] **Patterns**: Follows project architecture
- [ ] **Performance**: No obvious bottlenecks
- [ ] **Documentation**: Docstrings/comments added
- [ ] **Error Handling**: Proper exception handling
- [ ] **Dependencies**: No unnecessary libraries added

## 🎓 Training Team on AI Tools

### Week 1: Introduction

- **Day 1**: AI tools overview (Claude, Copilot)
- **Day 2**: Setup and configuration
- **Day 3**: Basic prompting techniques
- **Day 4**: Code review with AI
- **Day 5**: Hands-on practice

### Week 2: Advanced Usage

- **Day 1**: Refactoring with AI
- **Day 2**: Test generation
- **Day 3**: Debugging with AI
- **Day 4**: Documentation generation
- **Day 5**: Team pairing sessions

### Learning Resources

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [GitHub Copilot Docs](https://docs.github.com/copilot)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- Internal wiki: [Link to company wiki]

## 📊 Measuring AI Effectiveness

Track these metrics:

1. **Velocity**:
   - Story points completed per sprint
   - Time to implement features
   - Bug fix turnaround time

2. **Quality**:
   - Bugs introduced by AI code
   - Code review iteration count
   - Test coverage of AI code

3. **Adoption**:
   - % of PRs using AI assistance
   - Team satisfaction surveys
   - AI tool usage analytics

## ⚠️ Common Pitfalls

### Problem: AI generates insecure code

**Solution**:
- Use security-focused prompts
- Always review for OWASP Top 10
- Run security linters (bandit, semgrep)
- Add security review step

### Problem: Generated code doesn't match style

**Solution**:
- Reference CLAUDE.md in prompts
- Use formatters (Black, Prettier)
- Include style guide in prompts
- Setup pre-commit hooks

### Problem: Over-reliance on AI

**Solution**:
- Require human design review first
- Pair program (human + AI)
- Mandatory code review by humans
- Limit AI to implementation, not design

## 🚀 Advanced Patterns

### Pattern 1: AI-Assisted Refactoring

```
Context: We're refactoring pipeline.py (Task #12)

Step 1: "Analyze backend/app/services/pipeline.py and identify distinct stages in process_job()"
Step 2: "Design interface for pipeline stages using Protocol pattern"
Step 3: "Implement FetchDiffStage following the interface"
Step 4: [Continue for each stage]
Step 5: "Create orchestrator to chain stages together"
```

### Pattern 2: Test-Driven with AI

```
1. Write test skeleton with Claude
2. Run test (should fail)
3. Ask Claude to implement to make test pass
4. Review implementation
5. Refactor with Claude
6. Repeat
```

### Pattern 3: Documentation Generation

```
"Generate API documentation for all endpoints in backend/app/api/routes/ingest.py following OpenAPI 3.0 spec. Include request/response examples and error codes."
```

## 📞 Getting Help

- **Claude Issues**: Check Claude Code GitHub issues
- **Copilot Issues**: GitHub Copilot community
- **Team Channel**: #ai-dev-tools on Slack
- **Office Hours**: Fridays 3-4 PM for AI pair programming

---

**Remember**: AI is a tool to augment developers, not replace them. Always apply human judgment, especially for security and architecture decisions.

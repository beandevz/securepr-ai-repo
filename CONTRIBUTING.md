# Contributing to SecurePR AI

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to SecurePR AI.

## 🎯 Quick Links

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good intent

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/securepr-ai-repo.git
cd securepr-ai-repo

# Add upstream remote
git remote add upstream https://github.com/YOUR_ORG/securepr-ai-repo.git
```

### 2. Set Up Development Environment

**Backend**:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
```

**Frontend**:
```bash
cd frontend
npm install
```

### 3. Create Environment File

```bash
cp backend/.env.example backend/.env
# Edit .env with your configuration
```

## 💻 Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/fixes
- `chore/description` - Maintenance tasks

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(pipeline): add support for GitLab webhooks
fix(rag): resolve embedding dimension mismatch
docs(api): update endpoint documentation
refactor(queue): extract queue manager class
```

### Development Process

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Keep branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

## 🔍 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Added tests for new features
- [ ] Updated documentation
- [ ] No merge conflicts with main
- [ ] Commits are clean and well-described

### PR Checklist

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual testing completed

## Screenshots (if UI changes)
[Add screenshots here]

## Related Issues
Fixes #123
```

### Review Process

1. Submit PR with clear description
2. Wait for CI checks to pass
3. Address reviewer feedback
4. Maintain discussion civility
5. Once approved, squash and merge

## 📏 Coding Standards

### Python (Backend)

**Style**:
- Follow PEP 8
- Use Black formatter
- Type hints required
- Docstrings for public functions

```python
def analyze_patch(self, path: str, patch: str) -> List[Finding]:
    """
    Analyze code patch for security issues.

    Args:
        path: File path
        patch: Git diff patch

    Returns:
        List of security findings
    """
    ...
```

**Imports**:
```python
# Standard library
import os
from typing import List, Dict

# Third-party
from fastapi import APIRouter
from pydantic import BaseModel

# Local
from app.domain.schemas import Finding
from app.services.llm_service import LlmService
```

**File Organization**:
```
backend/app/
  ├── api/          # API routes
  ├── core/         # Configuration, security
  ├── domain/       # Schemas, enums
  ├── services/     # Business logic
  ├── integrations/ # External integrations
  ├── interfaces/   # Protocols
  └── factories/    # Factory patterns
```

### TypeScript (Frontend)

**Style**:
- Use Prettier formatter
- Functional components + hooks
- TypeScript strict mode
- Props interfaces exported

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button className="btn" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

**File Organization**:
```
frontend/src/ui/
  ├── components/   # Reusable components
  ├── pages/        # Page components
  ├── hooks/        # Custom hooks
  ├── utils/        # Utilities
  ├── lib/          # API clients, storage
  └── types/        # TypeScript types
```

### Architecture Patterns

**Backend**:
- Use Protocols for abstraction
- Factory pattern for provider creation
- Service layer for business logic
- No business logic in routes

**Frontend**:
- Extract business logic to utils/hooks
- Components < 200 lines
- Types in separate files
- API client for all backend calls

## 🧪 Testing Guidelines

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_llm_service.py
```

**Test Structure**:
```python
def test_severity_comparison():
    """Test severity ordering."""
    findings = [
        Finding(severity="LOW", ...),
        Finding(severity="HIGH", ...),
    ]
    assert get_max_severity(findings) == "HIGH"
```

### Frontend Tests

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Type checking
npm run type-check
```

**Test Structure**:
```typescript
describe('severityClass', () => {
  it('should return "bad" for CRITICAL severity', () => {
    expect(severityClass('CRITICAL')).toBe('bad');
  });
});
```

## 📝 Documentation

### Code Documentation

- Add JSDoc/docstrings for public APIs
- Update README.md for feature changes
- Add examples for complex features
- Document configuration options

### API Documentation

Update `docs/API.md` when adding/modifying endpoints:

```markdown
### POST /ingest/github-actions

Ingest GitHub webhook for PR analysis.

**Headers**:
- `x-securepr-signature`: HMAC signature
- `x-securepr-github-token`: GitHub token

**Body**:
```json
{
  "pull_request": { ... },
  "repository": { ... }
}
```
```

## 🎨 UI/UX Guidelines

- Consistent with existing design system
- Responsive (mobile-friendly)
- Accessibility (ARIA labels, keyboard navigation)
- Loading states for async operations
- Error handling with user-friendly messages

## 🔒 Security Guidelines

- Never commit secrets (.env files)
- Validate all user inputs
- Use parameterized queries (prevent SQL injection)
- Escape output (prevent XSS)
- Follow OWASP best practices
- Review security implications of changes

## 🤖 Working with AI Assistants

### Using Claude Code

See `docs/AI_IMPLEMENTATION_GUIDE.md` for:
- Task templates
- Prompt examples
- Integration patterns

### Using GitHub Copilot

- Review AI suggestions carefully
- Don't blindly accept generated code
- Ensure tests cover AI-generated code
- Check for security implications

## ❓ Getting Help

- 💬 **Slack**: #securepr-ai channel
- 📧 **Email**: dev@yourcompany.com
- 🐛 **Issues**: Use GitHub Issues for bugs
- 💡 **Discussions**: Use GitHub Discussions for questions

## 📊 Project Boards

- **Backlog**: Planned features
- **In Progress**: Current work
- **Review**: Pending PRs
- **Done**: Completed work

## 🎉 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Monthly team updates

Thank you for contributing to SecurePR AI! 🚀

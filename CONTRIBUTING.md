# Contributing to SaggersRule

Thank you for your interest in contributing to SaggersRule! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git
- Basic knowledge of JavaScript/Node.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/saggersrule.git
   cd saggersrule
   ```

2. **Local Development**
   ```bash
   # Install API dependencies
   cd media-api
   npm install
   
   # Start development server
   npm run dev
   ```

3. **Docker Development**
   ```bash
   # Build and run stack
   docker compose up --build
   ```

## Project Structure

```
saggersrule/
├── docker-compose.yml          # Main deployment configuration
├── media-api/                  # Node.js API service
│   ├── src/
│   │   ├── server.js          # Main server file
│   │   └── routes/            # API routes
│   ├── Dockerfile
│   └── package.json
├── nginx/                      # Nginx configuration
│   └── conf.d/default.conf
└── docs/                       # Documentation (if added)
```

## Development Guidelines

### Code Style

- Use **ES6+** JavaScript features
- Follow **consistent indentation** (2 spaces)
- Use **meaningful variable names**
- Add **comments** for complex logic
- Follow **REST API** conventions

### API Development

#### Adding New Endpoints

1. Create route file in `media-api/src/routes/`
2. Follow existing patterns for error handling
3. Add appropriate middleware (auth, validation, etc.)
4. Update API documentation

Example:
```javascript
// media-api/src/routes/example.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Example endpoint' });
});

module.exports = router;
```

#### Error Handling

Always use consistent error responses:
```javascript
res.status(400).json({
  error: 'Error type',
  message: 'Detailed error message'
});
```

### Docker Development

#### Building Images

```bash
# Build specific service
docker compose build media-api

# Build all services
docker compose build
```

#### Testing Changes

```bash
# Restart specific service
docker compose restart media-api

# View logs
docker compose logs -f media-api
```

### Database Integration

If adding database features:

1. Use environment variables for configuration
2. Implement proper connection pooling
3. Add database migrations if needed
4. Include database in docker-compose.yml

## Testing

### Manual Testing

1. **Health Checks**
   ```bash
   curl http://localhost:3200/health
   curl http://localhost:3036/health
   ```

2. **File Upload**
   ```bash
   curl -X POST -F "file=@test.jpg" http://localhost:3200/upload
   ```

3. **File Access**
   ```bash
   curl http://localhost:3036/media/uploads/filename.jpg
   ```

### Automated Testing

When adding tests:
```bash
cd media-api
npm test
```

## Contribution Process

### Before Contributing

1. **Check existing issues** - Look for related issues or discussions
2. **Create an issue** - Describe the feature or bug you want to work on
3. **Get feedback** - Discuss your approach with maintainers

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding guidelines
   - Add tests if applicable
   - Update documentation

3. **Test thoroughly**
   - Test your changes locally
   - Ensure existing functionality still works
   - Test with Docker deployment

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add thumbnail generation for uploaded images
fix: resolve file upload size validation issue
docs: update API documentation for upload endpoint
```

### Pull Request Process

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use descriptive title and description
   - Reference related issues
   - Include testing instructions
   - Add screenshots if UI changes

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Changes Made
   - List of specific changes
   
   ## Testing
   - How to test these changes
   
   ## Related Issues
   - Fixes #123
   ```

## Code Review Guidelines

### For Contributors

- Be open to feedback
- Respond to review comments promptly
- Make requested changes or discuss alternatives
- Keep PRs focused and reasonably sized

### For Reviewers

- Be constructive and helpful
- Focus on code quality and maintainability
- Test the changes if possible
- Approve when ready or request specific changes

## Feature Requests

### Suggesting Features

1. **Check existing features** - Review current capabilities
2. **Search issues** - Look for similar requests
3. **Create detailed issue** - Include use case and rationale
4. **Provide examples** - Show how feature would be used

### Feature Priority

Features are prioritized based on:
- **User impact** - How many users would benefit
- **Complexity** - Development effort required
- **Maintenance** - Long-term maintenance burden
- **Alignment** - Fits project goals and vision

## Bug Reports

### Reporting Bugs

Include in your bug report:
1. **Environment details** (OS, Docker version, etc.)
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Error messages** or logs
5. **Screenshots** if applicable

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Environment
- OS: Ubuntu 20.04
- Docker: 20.10.x
- Browser: Chrome 91+

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Error Messages
Any error messages or logs

## Additional Context
Any other relevant information
```

## Documentation

### Updating Documentation

- Keep README.md up to date
- Update API documentation for endpoint changes
- Add inline code comments for complex logic
- Update deployment guides for configuration changes

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Keep formatting consistent
- Test documentation steps

## Community Guidelines

### Be Respectful

- Treat all contributors with respect
- Be patient with newcomers
- Provide constructive feedback
- Help others learn and improve

### Communication Channels

- **GitHub Issues** - Bug reports, feature requests
- **Pull Requests** - Code discussions
- **Discussions** - General questions and ideas

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Checklist

- [ ] Update version numbers
- [ ] Update CHANGELOG.md
- [ ] Test deployment process
- [ ] Create release notes
- [ ] Tag release in Git

Thank you for contributing to SaggersRule! 🚀
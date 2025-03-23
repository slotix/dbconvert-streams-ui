# Changelog Generation Script

This directory contains a Python script to generate a changelog from git commits.

## Python Script (generate-changelog.py)

A feature-rich script for generating changelogs with many customization options.

### Usage

```bash
python generate-changelog.py [options]
```

### Options

- `--output-file FILENAME`: Output file (default: CHANGELOG.md)
- `--since DATE`: Include commits since this date (YYYY-MM-DD)
- `--until DATE`: Include commits until this date (YYYY-MM-DD)
- `--version VERSION`: Version number for the changelog entry
- `--include-author`: Include commit authors in the changelog
- `--include-date`: Include commit dates in the changelog
- `--group-by-date`: Group commits by date instead of by type
- `--conventional-commits`: Parse conventional commit messages

### Examples

```bash
# Generate basic changelog
python generate-changelog.py

# Generate changelog with version number
python generate-changelog.py --version "1.0.0"

# Generate changelog with commits since a specific date
python generate-changelog.py --since "2023-01-01"

# Generate detailed changelog with authors and dates
python generate-changelog.py --include-author --include-date

# Generate changelog grouped by date instead of by type
python generate-changelog.py --group-by-date

# Generate changelog with conventional commit parsing
python generate-changelog.py --conventional-commits

# Combine multiple options
python generate-changelog.py --output-file release-notes.md --version "1.0.0" --since "2023-01-01" --include-author --conventional-commits
```

## Commit Message Format

For best results, follow these commit message formats:

### Simple Format

Start your commit message with one of these prefixes:

- `feat:` or `add:` - New features or additions
- `fix:` or `bug:` - Bug fixes
- `change:`, `update:`, `improve:`, or `refactor:` - Changes or improvements
- `remove:` or `delete:` - Removed features
- `security:` - Security fixes
- `docs:` or `doc:` - Documentation changes
- `test:` or `tests:` - Test-related changes
- `chore:`, `build:`, or `ci:` - Maintenance tasks

### Conventional Commits Format

For more structured changelogs, use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Where `type` is one of:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit 
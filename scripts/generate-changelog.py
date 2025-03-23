#!/usr/bin/env python3

"""
Script to generate a changelog from git commits
Usage: python generate-changelog.py [options]

Options:
  --output-file FILENAME   Output file (default: CHANGELOG.md)
  --since DATE             Include commits since this date (YYYY-MM-DD)
  --until DATE             Include commits until this date (YYYY-MM-DD)
  --version VERSION        Version number for the changelog entry
  --include-author         Include commit authors in the changelog
  --include-date           Include commit dates in the changelog
  --group-by-date          Group commits by date instead of by type
  --conventional-commits   Parse conventional commit messages
"""

import argparse
import datetime
import os
import re
import subprocess
import sys


def parse_args():
    parser = argparse.ArgumentParser(description='Generate a changelog from git commits')
    parser.add_argument('--output-file', default='CHANGELOG.md', help='Output file (default: CHANGELOG.md)')
    parser.add_argument('--since', help='Include commits since this date (YYYY-MM-DD)')
    parser.add_argument('--until', help='Include commits until this date (YYYY-MM-DD)')
    parser.add_argument('--version', help='Version number for the changelog entry')
    parser.add_argument('--include-author', action='store_true', help='Include commit authors in the changelog')
    parser.add_argument('--include-date', action='store_true', help='Include commit dates in the changelog')
    parser.add_argument('--group-by-date', action='store_true', help='Group commits by date instead of by type')
    parser.add_argument('--conventional-commits', action='store_true', help='Parse conventional commit messages')
    return parser.parse_args()


def run_git_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ""


def get_commits(since=None, until=None, include_author=False, include_date=False, conventional_commits=False):
    date_filter = []
    if since:
        date_filter.append(f'--since="{since}"')
    if until:
        date_filter.append(f'--until="{until}"')
    
    date_filter_str = ' '.join(date_filter)
    
    format_parts = ['%s']
    if include_author:
        format_parts.append('%an')
    if include_date:
        format_parts.append('%ad')
    
    format_str = '%x1f'.join(format_parts)
    
    command = f'git log {date_filter_str} --pretty=format:"{format_str}" --no-merges'
    output = run_git_command(command)
    
    if not output:
        return []
    
    commits = []
    for line in output.split('\n'):
        parts = line.split('\x1f')
        
        message = parts[0]
        
        # Skip merge commits
        if message.startswith('Merge '):
            continue
        
        commit_info = {
            'message': message,
        }
        
        if include_author and len(parts) > 1:
            commit_info['author'] = parts[1]
        
        if include_date and len(parts) > (2 if include_author else 1):
            commit_info['date'] = parts[2 if include_author else 1]
        
        if conventional_commits:
            # Parse conventional commit format: type(scope): description
            match = re.match(r'^(\w+)(?:\(([^)]+)\))?: (.+)$', message)
            if match:
                commit_type, scope, description = match.groups()
                commit_info['type'] = commit_type
                commit_info['scope'] = scope
                commit_info['description'] = description
            else:
                commit_info['type'] = 'other'
                commit_info['description'] = message
        else:
            # Simple classification based on keywords
            if re.match(r'^(feat|add|feature)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'added'
            elif re.match(r'^(fix|bug)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'fixed'
            elif re.match(r'^(change|update|improve|refactor)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'changed'
            elif re.match(r'^(remove|delete)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'removed'
            elif re.match(r'^(security)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'security'
            elif re.match(r'^(docs|doc)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'documentation'
            elif re.match(r'^(test|tests)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'tests'
            elif re.match(r'^(chore|build|ci)(\(.*\))?:', message, re.IGNORECASE):
                commit_info['type'] = 'maintenance'
            else:
                commit_info['type'] = 'other'
        
        commits.append(commit_info)
    
    return commits


def group_commits_by_type(commits):
    grouped = {}
    for commit in commits:
        commit_type = commit['type']
        if commit_type not in grouped:
            grouped[commit_type] = []
        grouped[commit_type].append(commit)
    return grouped


def group_commits_by_date(commits):
    grouped = {}
    for commit in commits:
        if 'date' not in commit:
            date_str = 'Unknown'
        else:
            # Parse the git date format and convert to YYYY-MM-DD
            try:
                date_obj = datetime.datetime.strptime(commit['date'], '%a %b %d %H:%M:%S %Y %z')
                date_str = date_obj.strftime('%Y-%m-%d')
            except ValueError:
                date_str = commit['date']
        
        if date_str not in grouped:
            grouped[date_str] = []
        grouped[date_str].append(commit)
    
    return grouped


def format_commit(commit, include_author=False, include_date=False, conventional_commits=False):
    if conventional_commits:
        message = commit['description']
    else:
        message = commit['message']
    
    # Remove any conventional commit prefix for cleaner output if not using conventional commits
    if not conventional_commits:
        message = re.sub(r'^(\w+)(\(.*\))?:\s*', '', message)
    
    result = f"- {message}"
    
    if include_author:
        result += f" by {commit['author']}"
    
    if include_date and 'date' in commit:
        result += f" on {commit['date']}"
    
    return result


def generate_changelog(commits, version=None, include_author=False, include_date=False, 
                       group_by_date=False, conventional_commits=False):
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    content = "# Changelog\n\n"
    content += "All notable changes to this project will be documented in this file.\n\n"
    
    # Version header
    if version:
        content += f"## [{version}] - {today}\n\n"
    else:
        content += f"## [{today}]\n\n"
    
    if group_by_date:
        grouped_commits = group_commits_by_date(commits)
        # Sort dates in reverse chronological order
        for date in sorted(grouped_commits.keys(), reverse=True):
            content += f"### {date}\n\n"
            for commit in grouped_commits[date]:
                content += format_commit(commit, include_author, include_date, conventional_commits) + "\n"
            content += "\n"
    else:
        grouped_commits = group_commits_by_type(commits)
        
        # Define the order of sections
        sections = [
            ('added', 'Added'),
            ('changed', 'Changed'),
            ('fixed', 'Fixed'),
            ('removed', 'Removed'),
            ('security', 'Security'),
            ('documentation', 'Documentation'),
            ('tests', 'Tests'),
            ('maintenance', 'Maintenance'),
            ('other', 'Other Changes')
        ]
        
        # Add each section
        for section_key, section_title in sections:
            if section_key in grouped_commits and grouped_commits[section_key]:
                content += f"### {section_title}\n"
                for commit in grouped_commits[section_key]:
                    content += format_commit(commit, include_author, include_date, conventional_commits) + "\n"
                content += "\n"
    
    return content


def main():
    args = parse_args()
    
    print(f"Generating changelog to {args.output_file}...")
    
    commits = get_commits(
        since=args.since,
        until=args.until,
        include_author=args.include_author,
        include_date=args.include_date,
        conventional_commits=args.conventional_commits
    )
    
    if not commits:
        print("No commits found matching the criteria.")
        return
    
    changelog_content = generate_changelog(
        commits,
        version=args.version,
        include_author=args.include_author,
        include_date=args.include_date,
        group_by_date=args.group_by_date,
        conventional_commits=args.conventional_commits
    )
    
    with open(args.output_file, 'w') as f:
        f.write(changelog_content)
    
    print(f"Changelog generated successfully at {args.output_file}")


if __name__ == "__main__":
    main() 
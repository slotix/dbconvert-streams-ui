#!/usr/bin/env python3

"""
Script to generate a marketing-friendly changelog from git commits
Usage: python generate-marketing-changelog.py [options]

Options:
  --output-file FILENAME   Output file (default: WHATS_NEW.md)
  --since DATE             Include commits since this date (YYYY-MM-DD)
  --until DATE             Include commits until this date (YYYY-MM-DD)
  --version VERSION        Version number for the changelog entry
  --title TEXT             Title for the changelog (default: "DBConvert Streams: What's New")
"""

import argparse
import datetime
import os
import re
import subprocess
import sys


def parse_args():
    parser = argparse.ArgumentParser(description='Generate a marketing-friendly changelog')
    parser.add_argument('--output-file', default='WHATS_NEW.md', help='Output file (default: WHATS_NEW.md)')
    parser.add_argument('--since', help='Include commits since this date (YYYY-MM-DD)')
    parser.add_argument('--until', help='Include commits until this date (YYYY-MM-DD)')
    parser.add_argument('--version', help='Version number for the changelog entry')
    parser.add_argument('--title', default='DBConvert Streams: What\'s New', help='Title for the changelog')
    return parser.parse_args()


def run_git_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ""


def get_commits(since=None, until=None):
    date_filter = []
    if since:
        date_filter.append(f'--since="{since}"')
    if until:
        date_filter.append(f'--until="{until}"')
    
    date_filter_str = ' '.join(date_filter)
    
    command = f'git log {date_filter_str} --pretty=format:"%s" --no-merges'
    output = run_git_command(command)
    
    if not output:
        return []
    
    commits = []
    for message in output.split('\n'):
        # Skip merge commits
        if message.startswith('Merge '):
            continue
        
        commit_info = {
            'message': message,
            'type': classify_commit(message)
        }
        
        commits.append(commit_info)
    
    return commits


def classify_commit(message):
    """Classify commit into marketing-friendly categories"""
    message_lower = message.lower()
    
    if re.search(r'(add|new|feature|implement|introduc)', message_lower):
        return 'new_features'
    elif re.search(r'(improv|enhanc|better|optimiz|upgrad|boost)', message_lower):
        return 'improvements'
    elif re.search(r'(fix|bug|issue|problem|resolv|correct)', message_lower):
        return 'fixes'
    elif re.search(r'(document|guide|tutorial|example|instruct)', message_lower):
        return 'documentation'
    elif re.search(r'(secur|protect|safe|vulnerab)', message_lower):
        return 'security'
    elif re.search(r'(ui|ux|interface|design|visual|display)', message_lower):
        return 'user_experience'
    elif re.search(r'(perform|speed|fast|quick|latency|throughput)', message_lower):
        return 'performance'
    else:
        return 'other'


def marketing_rewrite(commit_type, message):
    """Convert technical commit messages to marketing-friendly descriptions"""
    
    # Remove any prefixes like "feat:", "fix:", etc.
    clean_message = re.sub(r'^(\w+)(\(.*\))?:\s*', '', message)
    
    # Capitalize first letter
    clean_message = clean_message[0].upper() + clean_message[1:]
    
    # Add marketing spin based on commit type
    if commit_type == 'new_features':
        icon = "✨"
        prefix = "New Feature"
        # Add benefit statements for features
        if re.search(r'workflow', clean_message, re.IGNORECASE):
            benefit = "streamlining your data pipeline processes"
        elif re.search(r'statistic', clean_message, re.IGNORECASE):
            benefit = "giving you deeper insights into your data"
        elif re.search(r'monitor', clean_message, re.IGNORECASE):
            benefit = "providing real-time visibility into your operations"
        else:
            benefit = "enhancing your data migration capabilities"
        
        return f"{icon} **{prefix}**: {clean_message}, {benefit}."
        
    elif commit_type == 'improvements':
        icon = "🚀"
        prefix = "Enhancement"
        # Add benefit statements for improvements
        if re.search(r'performance|speed|fast', clean_message, re.IGNORECASE):
            benefit = "resulting in faster processing times"
        elif re.search(r'user|interface|ui', clean_message, re.IGNORECASE):
            benefit = "making your experience more intuitive"
        else:
            benefit = "improving overall system reliability"
            
        return f"{icon} **{prefix}**: {clean_message}, {benefit}."
        
    elif commit_type == 'fixes':
        icon = "🛠️"
        prefix = "Improvement"
        return f"{icon} **{prefix}**: {clean_message}, ensuring smoother operations."
        
    elif commit_type == 'documentation':
        icon = "📚"
        prefix = "Documentation"
        return f"{icon} **{prefix}**: {clean_message}, making implementation easier than ever."
        
    elif commit_type == 'security':
        icon = "🔒"
        prefix = "Security Enhancement"
        return f"{icon} **{prefix}**: {clean_message}, keeping your data safe and secure."
        
    elif commit_type == 'user_experience':
        icon = "🎨"
        prefix = "User Experience"
        return f"{icon} **{prefix}**: {clean_message}, creating a more intuitive interface."
        
    elif commit_type == 'performance':
        icon = "⚡"
        prefix = "Performance Boost"
        return f"{icon} **{prefix}**: {clean_message}, delivering faster results for your business."
        
    else:
        icon = "🔄"
        prefix = "Update"
        return f"{icon} **{prefix}**: {clean_message}, continuously improving your experience."


def generate_marketing_changelog(commits, title, version=None):
    today = datetime.datetime.now().strftime('%B %d, %Y')  # More marketing-friendly date format
    
    content = f"# {title}\n\n"
    
    # Add a marketing intro paragraph
    content += "We're constantly improving DBConvert Streams to make your data migration and synchronization "
    content += "experience better, faster, and more reliable. Check out our latest updates below!\n\n"
    
    # Version header
    if version:
        content += f"## Version {version} - {today}\n\n"
    else:
        content += f"## Latest Updates - {today}\n\n"
    
    # Group commits by marketing category
    grouped_commits = {}
    for commit in commits:
        commit_type = commit['type']
        if commit_type not in grouped_commits:
            grouped_commits[commit_type] = []
        grouped_commits[commit_type].append(commit)
    
    # Define the order and titles of sections
    sections = [
        ('new_features', '🌟 New Features'),
        ('improvements', '🚀 Enhancements'),
        ('performance', '⚡ Performance Improvements'),
        ('user_experience', '🎨 User Experience Updates'),
        ('documentation', '📚 Documentation Improvements'),
        ('fixes', '🛠️ Fixes & Improvements'),
        ('security', '🔒 Security Enhancements'),
        ('other', '🔄 Other Updates')
    ]
    
    # Add each section
    for section_key, section_title in sections:
        if section_key in grouped_commits and grouped_commits[section_key]:
            content += f"### {section_title}\n\n"
            for commit in grouped_commits[section_key]:
                marketing_message = marketing_rewrite(section_key, commit['message'])
                content += f"{marketing_message}\n\n"
    
    return content


def main():
    args = parse_args()
    
    print(f"Generating marketing changelog to {args.output_file}...")
    
    commits = get_commits(since=args.since, until=args.until)
    
    if not commits:
        print("No commits found matching the criteria.")
        return
    
    changelog_content = generate_marketing_changelog(
        commits,
        title=args.title,
        version=args.version
    )
    
    with open(args.output_file, 'w') as f:
        f.write(changelog_content)
    
    print(f"Marketing changelog generated successfully at {args.output_file}")


if __name__ == "__main__":
    main() 
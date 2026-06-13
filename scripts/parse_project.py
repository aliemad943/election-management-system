#!/usr/bin/env python3
"""Parse project_full_source.md and extract all source code files."""

import re
import os
import sys

MD_PATH = '/home/z/my-project/upload/project_full_source.md'
PROJECT_ROOT = '/home/z/my-project'

def parse_markdown(md_path):
    """Parse markdown file and extract file paths with their content."""
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern: ## `filepath` followed by ```lang ... ```
    # The file path is between ## and the backticks
    pattern = r'##\s+`([^`]+)`\s*\n+```[\w]*\n(.*?)```'
    
    matches = re.findall(pattern, content, re.DOTALL)
    
    files = []
    for filepath, code in matches:
        filepath = filepath.strip()
        code = code.strip()
        # Skip if empty
        if not code:
            continue
        files.append((filepath, code))
    
    return files

def write_files(files, project_root):
    """Write extracted files to the project directory."""
    created = []
    for filepath, code in files:
        # Determine full path
        if filepath.startswith('/'):
            # Absolute path - skip
            print(f"SKIP (absolute): {filepath}")
            continue
        
        full_path = os.path.join(project_root, filepath)
        
        # Create directory if needed
        dir_path = os.path.dirname(full_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        
        # Write the file
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(code)
        
        created.append(filepath)
        print(f"CREATED: {filepath}")
    
    return created

def main():
    files = parse_markdown(MD_PATH)
    print(f"Found {len(files)} files in markdown")
    print("=" * 60)
    
    created = write_files(files, PROJECT_ROOT)
    print("=" * 60)
    print(f"Successfully created {len(created)} files")

if __name__ == '__main__':
    main()

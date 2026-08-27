#!/bin/bash
# Auto-lint files after Claude edits/writes
# Runs eslint --fix on changed .ts/.tsx/.js/.jsx files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Exit early if no file path
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only lint JS/TS files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    npx eslint --fix "$FILE_PATH" 2>/dev/null
    ;;
esac

exit 0

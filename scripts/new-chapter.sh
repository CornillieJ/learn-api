#!/usr/bin/env bash
# Scaffold a new chapter: copies templates/chapter.md into src/<slug>.md,
# fills in the title, and wires it into src/SUMMARY.md and the progress
# map in src/README.md. Without this, adding a chapter means remembering
# to touch all three files by hand.
#
# Usage:
#   scripts/new-chapter.sh "Chapter title" ["Progress map blurb"]
# Run with no arguments to be prompted for both.
set -euo pipefail
cd "$(dirname "$0")/.."

TITLE="${1:-}"
if [ -z "$TITLE" ]; then
  read -rp "Chapter title: " TITLE
fi
if [ -z "$TITLE" ]; then
  echo "A title is required." >&2
  exit 1
fi

BLURB="${2:-}"
if [ -z "$BLURB" ]; then
  read -rp "One-line blurb for the progress map (optional): " BLURB
fi

# Slugify: lowercase, non-alphanumerics to hyphens, trim/collapse hyphens.
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
if [ -z "$SLUG" ]; then
  echo "Could not derive a filename from that title." >&2
  exit 1
fi

DEST="src/$SLUG.md"
if [ -e "$DEST" ]; then
  echo "$DEST already exists, aborting." >&2
  exit 1
fi

cp templates/chapter.md "$DEST"
# Replace only the first line (the placeholder h1), leaving the rest of
# the template (including any "Chapter Title" mentioned later) untouched.
TITLE_ESCAPED=$(printf '%s' "$TITLE" | sed -e 's/[\/&]/\\&/g')
sed -i "1s/^# Chapter Title\$/# ${TITLE_ESCAPED}/" "$DEST"

LINK="[$TITLE]($SLUG.md)"

# SUMMARY.md: add under "# Start", right before "# Reference" if present,
# otherwise at the end of the file.
awk -v link="- $LINK" '
  !inserted && /^# Reference/ { print link; print ""; inserted = 1 }
  { print }
  END { if (!inserted) { print ""; print link } }
' src/SUMMARY.md > src/SUMMARY.md.tmp
mv src/SUMMARY.md.tmp src/SUMMARY.md

# Progress map in src/README.md: add right before the first entry that
# isn't a chapter (the "Component gallery" reference link), so new
# chapters land with the other chapters rather than after the reference
# pages.
awk -v link="- $LINK $BLURB" '
  !inserted && /Component gallery/ { print link; inserted = 1 }
  { print }
' src/README.md > src/README.md.tmp
mv src/README.md.tmp src/README.md

echo "Created $DEST"
echo "Added to src/SUMMARY.md and the progress map in src/README.md."
echo "Next: replace the placeholders in $DEST, then run \`mdbook serve --open\`."

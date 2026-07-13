@echo off
REM Push changes to GitHub.
REM Authentication is handled by your Git credential manager or SSH key.
REM Run: gh auth login   (if using GitHub CLI)
REM  or:  git remote set-url origin git@github.com:arrach-imane/Cyber-Range-UCA.git  (SSH)

git push origin main

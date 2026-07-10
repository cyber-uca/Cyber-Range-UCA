@echo off
cd /d "C:\Users\imane\Desktop\Cyber range\platform design\cyber-range-platform\platform"
git add deploy/ backend/app/gateway/adapters/proxmox_adapter.py backend/app/models.py backend/.env.example
git commit -m "feat: add deploy scripts and Proxmox adapter for Option B deployment"
git push https://arrach-imane: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@github.com/arrach-imane/Cyber-Range-UCA.git main
echo Done.

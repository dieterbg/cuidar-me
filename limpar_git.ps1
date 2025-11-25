# Script para limpar e otimizar o repositório Git

Write-Host "Iniciando limpeza do Git..." -ForegroundColor Cyan

# 1. Remover arquivos do índice que deveriam ser ignorados (cached)
Write-Host "Removendo arquivos ignorados do cache..." -ForegroundColor Yellow
git rm -r --cached .
git add .
git commit -m "chore: remove ignored files from git cache"

# 2. Otimizar o banco de dados do Git (Garbage Collection)
Write-Host "Executando Garbage Collection e Pruning..." -ForegroundColor Yellow
git gc --prune=now --aggressive

# 3. Verificar tamanho da pasta .git
$gitSize = (Get-ChildItem .git -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Tamanho atual da pasta .git: $([math]::Round($gitSize, 2)) MB" -ForegroundColor Green

Write-Host "Limpeza concluída!" -ForegroundColor Cyan
Write-Host "Se o tamanho ainda estiver muito grande, pode ser necessário recriar o repositório (apagar .git e dar git init novamente)." -ForegroundColor Gray

#!/usr/bin/env pwsh
# MANUTENCAO_HELPER.ps1
# Script para automação de ativação/desativação de manutenção forçada no Netlify

param(
    [Parameter(Position = 0)]
    [ValidateSet("ativar", "desativar", "testar", "status", "help")]
    [string]$acao = "help",

    [Parameter(Position = 1)]
    [string]$mensagem = $null
)

# === Cores para output ===
$Color_Success = "Green"
$Color_Error   = "Red"
$Color_Info    = "Cyan"
$Color_Warning = "Yellow"

# === Configurações ===
$ArquivoRedirects   = "public\_redirects"
$LinhaComentada    = "# /* /maintenance.html  503 */"
$LinhaDescomentada  = "/* /maintenance.html  503 */"
$BranchTeste       = "test/manutencao-teste"

function Write-Success {
    param([string]$msg)
    Write-Host "✅ $msg" -ForegroundColor $Color_Success
}

function Write-Error-Custom {
    param([string]$msg)
    Write-Host "❌ $msg" -ForegroundColor $Color_Error
}

function Write-Info {
    param([string]$msg)
    Write-Host "ℹ️  $msg" -ForegroundColor $Color_Info
}

function Write-Warning {
    param([string]$msg)
    Write-Host "⚠️  $msg" -ForegroundColor $Color_Warning
}

function Validar-Git {
    if (-not (Test-Path ".git")) {
        Write-Error-Custom "Repositório Git não encontrado. Execute o script na raiz do projeto."
        exit 1
    }
}

function Ativar-Manutencao {
    Write-Info "Ativando manutenção forçada…"
    
    Validar-Git
    
    if (-not (Test-Path $ArquivoRedirects)) {
        Write-Error-Custom "Arquivo '$ArquivoRedirects' não encontrado. Execute este script na raiz do repositório."
        exit 1
    }

    $conteudo = Get-Content -Path $ArquivoRedirects -Raw

    if ($conteudo -match [regex]::Escape($LinhaDescomentada)) {
        Write-Warning "Manutenção já está ATIVA em $ArquivoRedirects"
        return
    }

    if (-not ($conteudo -match [regex]::Escape($LinhaComentada))) {
        Write-Error-Custom "Linha de manutenção não encontrada em $ArquivoRedirects"
        exit 1
    }

    $novoConteudo = $conteudo -replace [regex]::Escape($LinhaComentada), $LinhaDescomentada
    Set-Content -Path $ArquivoRedirects -Value $novoConteudo -Encoding UTF8

    Write-Success "Manutenção ATIVADA em $ArquivoRedirects"

    Write-Info "Fazendo commit e push para 'main'..."
    git add -- $ArquivoRedirects
    $msg = if ($mensagem) { $mensagem } else { "ops(manutenção): ativar manutenção forçada" }
    git commit -m $msg
    git push origin main

    Write-Success "Push concluído. Netlify iniciará build e deploy automaticamente."
    Write-Info "Aguarde alguns segundos e verifique o status no Netlify dashboard."
}

function Desativar-Manutencao {
    Write-Info "Desativando manutenção forçada…"
    
    Validar-Git
    
    if (-not (Test-Path $ArquivoRedirects)) {
        Write-Error-Custom "Arquivo '$ArquivoRedirects' não encontrado."
        exit 1
    }

    $conteudo = Get-Content -Path $ArquivoRedirects -Raw

    if ($conteudo -match [regex]::Escape($LinhaComentada)) {
        Write-Warning "Manutenção já está DESATIVADA em $ArquivoRedirects"
        return
    }

    if (-not ($conteudo -match [regex]::Escape($LinhaDescomentada))) {
        Write-Error-Custom "Linha de manutenção não encontrada em $ArquivoRedirects"
        exit 1
    }

    $novoConteudo = $conteudo -replace [regex]::Escape($LinhaDescomentada), $LinhaComentada
    Set-Content -Path $ArquivoRedirects -Value $novoConteudo -Encoding UTF8

    Write-Success "Manutenção DESATIVADA em $ArquivoRedirects"

    Write-Info "Fazendo commit e push para 'main'..."
    git add -- $ArquivoRedirects
    $msg = if ($mensagem) { $mensagem } else { "ops(manutenção): desativar manutenção" }
    git commit -m $msg
    git push origin main

    Write-Success "Push concluído. Netlify iniciará build e deploy automaticamente."
    Write-Info "Aguarde alguns segundos e verifique o status no Netlify dashboard."
}

function Testar-Manutencao {
    Write-Info "Criando branch de teste para validar manutenção…"
    
    Validar-Git
    
    # Verificar se já está em branch de teste
    $branchAtual = git rev-parse --abbrev-ref HEAD
    if ($branchAtual -eq $BranchTeste) {
        Write-Warning "Já está na branch $BranchTeste"
        return
    }
    
    # Criar branch de teste
    Write-Info "Criando branch: $BranchTeste"
    git checkout -b $BranchTeste 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Erro ao criar branch. Talvez já exista."
        Write-Info "Tentando fazer checkout…"
        git checkout $BranchTeste
    }
    
    # Descomente manutenção
    Write-Info "Descomentando manutenção em $ArquivoRedirects…"
    $conteudo = Get-Content $ArquivoRedirects -Raw
    $novoConteudo = $conteudo -replace [regex]::Escape($LinhaComentada), $LinhaDescomentada
    Set-Content -Path $ArquivoRedirects -Value $novoConteudo
    
    # Commit e push
    git add $ArquivoRedirects
    git commit -m "test: simular manutenção forçada para validação"
    git push -u origin $BranchTeste
    
    Write-Success "Deploy Preview será criado em alguns segundos"
    Write-Info "Verifique o Netlify dashboard para o link temporário"
    Write-Info "Quando terminar de testar, execute: git checkout main && git branch -D $BranchTeste"
}

function Status-Manutencao {
    Write-Info "Verificando status de manutenção…"
    
    if (-not (Test-Path $ArquivoRedirects)) {
        Write-Error-Custom "Arquivo $ArquivoRedirects não encontrado."
        exit 1
    }
    
    $conteudo = Get-Content $ArquivoRedirects -Raw
    
    if ($conteudo -match [regex]::Escape($LinhaDescomentada)) {
        Write-Warning "Status: MANUTENÇÃO ATIVA"
        Write-Info "Regra descomentada em $ArquivoRedirects"
        Write-Info "Todas as rotas respondem com 503 → /maintenance.html"
    } elseif ($conteudo -match [regex]::Escape($LinhaComentada)) {
        Write-Success "Status: OPERAÇÃO NORMAL"
        Write-Info "Regra comentada em $ArquivoRedirects"
        Write-Info "Site está operacional"
    } else {
        Write-Error-Custom "Linha de manutenção não encontrada em $ArquivoRedirects"
    }
}

function Show-Help {
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║     MANUTENCAO_HELPER.ps1 — Automação de Manutenção Netlify   ║
╚════════════════════════════════════════════════════════════════╝

USO:
  .\MANUTENCAO_HELPER.ps1 <acao> [mensagem]

AÇÕES:
  ativar      Ativa manutenção forçada (status 503 para todas rotas)
  desativar   Desativa manutenção (retorna site ao normal)
  testar      Cria Deploy Preview para validar manutenção
  status      Mostra status atual de manutenção
  help        Mostra esta mensagem

EXEMPLOS:
  # Ativar manutenção
  .\MANUTENCAO_HELPER.ps1 ativar

  # Ativar com mensagem commit customizada
  .\MANUTENCAO_HELPER.ps1 ativar "ops: manutenção emergencial"

  # Desativar
  .\MANUTENCAO_HELPER.ps1 desativar

  # Testar em Deploy Preview
  .\MANUTENCAO_HELPER.ps1 testar

  # Verificar status
  .\MANUTENCAO_HELPER.ps1 status

NOTAS:
  • Execute sempre na raiz do repositório
  • Repositório Git deve estar configurado
  • Arquivo public\_redirects deve existir
  • Necessita Git instalado e configurado

DOCUMENTAÇÃO:
  Veja MANUTENCAO_NETLIFY.md para entender Deploy Preview
  Veja GUIA_ATIVAR_MANUTENCAO.md para passo-a-passo manual

SUPORTE:
  Se algo der errado, verifique:
  1. Você está na raiz do repositório?
  2. Arquivo public\_redirects existe?
  3. Git está configurado corretamente?

"@
}

# Main
switch ($acao) {
    "ativar" {
        Ativar-Manutencao
    }
    "desativar" {
        Desativar-Manutencao
    }
    "testar" {
        Testar-Manutencao
    }
    "status" {
        Status-Manutencao
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error-Custom "Ação desconhecida: $acao"
        Show-Help
        exit 1
    }
}

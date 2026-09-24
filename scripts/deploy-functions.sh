#!/usr/bin/env bash
# Deploy todas as Edge Functions do Nucleus para o Supabase
# Executar: bash scripts/deploy-functions.sh

set -e

echo "=== Deploy Nucleus Edge Functions ==="

FUNCTIONS=(
  claudinho
  evolution-proxy
  whatsapp-webhook
  asaas-webhook
  asaas-payment
  invite-user
  patient-portal-invite
  integration-manager
  google-calendar
)

for fn in "${FUNCTIONS[@]}"; do
  echo "→ Deploying $fn..."
  supabase functions deploy "$fn" --no-verify-jwt 2>/dev/null || \
  supabase functions deploy "$fn"
  echo "  ✓ $fn deployada"
done

echo ""
echo "=== Aplicar migrations ==="
supabase db push

echo ""
echo "=== Deploy concluído ==="
echo ""
echo "Próximos passos manuais:"
echo "1. Supabase Dashboard → Settings → Edge Functions → Secrets"
echo "   Adicionar: ANTHROPIC_API_KEY=sk-ant-..."
echo "2. Configurar URL do webhook da Evolution API:"
echo "   https://<seu-projeto>.supabase.co/functions/v1/whatsapp-webhook"
echo "3. Verificar variáveis da evolution-proxy no Supabase Dashboard"

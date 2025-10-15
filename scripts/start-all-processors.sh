#!/bin/bash

echo "========================================"
echo "Iniciando Todos os Processadores"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "[1/3] Iniciando WhatsApp Server..."
node whatsapp-server.js > logs/whatsapp-server.log 2>&1 &
WHATSAPP_PID=$!
echo "   PID: $WHATSAPP_PID"
sleep 2

echo "[2/3] Iniciando Processador de Lembretes..."
node reminder-processor.js > logs/reminder-processor.log 2>&1 &
REMINDER_PID=$!
echo "   PID: $REMINDER_PID"
sleep 2

echo "[3/4] Iniciando Processador de Faturas..."
node invoice-processor.js > logs/invoice-processor.log 2>&1 &
INVOICE_PID=$!
echo "   PID: $INVOICE_PID"
sleep 2

echo "[4/4] Iniciando Processador de Assinaturas..."
node subscription-processor.js > logs/subscription-processor.log 2>&1 &
SUBSCRIPTION_PID=$!
echo "   PID: $SUBSCRIPTION_PID"
sleep 2

echo ""
echo "========================================"
echo "Todos os processadores foram iniciados!"
echo "========================================"
echo ""
echo "Serviços rodando:"
echo "  - WhatsApp Server: http://localhost:3002 (PID: $WHATSAPP_PID)"
echo "  - Reminder Processor: http://localhost:3003/health (PID: $REMINDER_PID)"
echo "  - Invoice Processor: http://localhost:3004/health (PID: $INVOICE_PID)"
echo "  - Subscription Processor: http://localhost:3005/health (PID: $SUBSCRIPTION_PID)"
echo ""
echo "Para parar todos os serviços:"
echo "  kill $WHATSAPP_PID $REMINDER_PID $INVOICE_PID $SUBSCRIPTION_PID"
echo ""
echo "Logs em:"
echo "  - logs/whatsapp-server.log"
echo "  - logs/reminder-processor.log"
echo "  - logs/invoice-processor.log"
echo "  - logs/subscription-processor.log"
echo ""

# Salvar PIDs em arquivo
echo "$WHATSAPP_PID" > .pids/whatsapp-server.pid
echo "$REMINDER_PID" > .pids/reminder-processor.pid
echo "$INVOICE_PID" > .pids/invoice-processor.pid
echo "$SUBSCRIPTION_PID" > .pids/subscription-processor.pid

echo "PIDs salvos em .pids/"

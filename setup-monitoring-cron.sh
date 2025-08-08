#!/bin/bash

# Cron Job für tägliches Token-Monitoring einrichten

SCRIPT_DIR="/Users/macx116/Documents/projects/dnguyen/bits/render.com/bits-ai-docs-assist/ai-doc-assist"
LOG_DIR="$SCRIPT_DIR/logs"

# Log-Verzeichnis erstellen
mkdir -p "$LOG_DIR"

# Cron Job hinzufügen (täglich um 9:00 Uhr)
CRON_JOB="0 9 * * * $SCRIPT_DIR/token-monitor.sh --export >> $LOG_DIR/token-monitoring.log 2>&1"

# Aktuellen Crontab sichern
crontab -l > /tmp/current_crontab 2>/dev/null || touch /tmp/current_crontab

# Prüfen ob Job bereits existiert
if ! grep -q "token-monitor.sh" /tmp/current_crontab; then
    echo "$CRON_JOB" >> /tmp/current_crontab
    crontab /tmp/current_crontab
    echo "✅ Cron Job hinzugefügt: Tägliches Token-Monitoring um 9:00 Uhr"
else
    echo "ℹ️ Cron Job bereits vorhanden"
fi

# Cleanup
rm /tmp/current_crontab

echo ""
echo "📋 Aktuelle Cron Jobs:"
crontab -l | grep -E "(token-monitor|#)" || echo "Keine relevanten Cron Jobs gefunden"

echo ""
echo "📁 Logs werden gespeichert in: $LOG_DIR/token-monitoring.log"

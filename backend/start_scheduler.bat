@echo off
chcp 65001 >nul
title Kripto Sentiment Scheduler

echo.
echo  Kripto Sentiment Veri Toplama Scheduler baslatiliyor...
echo  Her 15 dakikada bir fiyat + haber + FinBERT analizi yapar.
echo  Durdurmak icin bu pencereyi kapatin veya Ctrl+C basin.
echo.

call venv\Scripts\activate.bat
python run_scheduler.py --interval 15

pause

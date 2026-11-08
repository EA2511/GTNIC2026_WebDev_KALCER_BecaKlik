# Becak Listrik Mobility Platform - PowerShell Runner
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   BECAK LISTRIK MOBILITY PLATFORM - RUNNER" -ForegroundColor Cyan
Write-Host "   Green Mobility & Fleet Simulation Platform Majalengka" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Memverifikasi Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate | Out-Null
    Write-Host "Prisma Client siap." -ForegroundColor Green
} catch {
    Write-Host "Peringatan: Prisma generate dilewati." -ForegroundColor DarkYellow
}

Write-Host "[2/3] Menjadwalkan pembukaan browser ke http://localhost:3000..." -ForegroundColor Yellow
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} | Out-Null

Write-Host "[3/3] Memulai server Next.js..." -ForegroundColor Green
Write-Host ""
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  URL Web    : http://localhost:3000" -ForegroundColor White
Write-Host "  Halaman    :" -ForegroundColor Gray
Write-Host "    - Beranda   : http://localhost:3000/" -ForegroundColor Gray
Write-Host "    - Login     : http://localhost:3000/login" -ForegroundColor Gray
Write-Host "    - Pelanggan : http://localhost:3000/pelanggan" -ForegroundColor Gray
Write-Host "    - Driver    : http://localhost:3000/driver" -ForegroundColor Gray
Write-Host "    - Admin     : http://localhost:3000/admin" -ForegroundColor Gray
Write-Host ""
Write-Host "  Tekan Ctrl + C untuk menghentikan server." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

npm run dev


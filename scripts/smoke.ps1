$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000/api'
$repoRoot = Split-Path -Parent $PSScriptRoot
$apiLog = Join-Path $repoRoot 'apps\api\dev-server.log'

function Post($path, $body, $headers = $null) {
  if ($headers) {
    Invoke-RestMethod -Uri "$base$path" -Method Post -ContentType 'application/json' -Headers $headers -Body ($body | ConvertTo-Json -Depth 5)
  } else {
    Invoke-RestMethod -Uri "$base$path" -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5)
  }
}

Write-Output "=== 1. health ==="
$health = Invoke-RestMethod -Uri "$base/health" -Method Get
Write-Output ($health | ConvertTo-Json -Depth 5)

Write-Output "`n=== 2. request-otp ==="
$req = Post '/auth/request-otp' @{ phone = '9876543210' }
Write-Output ($req | ConvertTo-Json -Depth 5)

Write-Output "`n=== 3. read OTP from server log ==="
$log = Get-Content $apiLog -Tail 40
$line = $log | Where-Object { $_ -match 'MOCK OTP' } | Select-Object -Last 1
Write-Output $line
if ($line -match 'code=(\d{6})') { $code = $Matches[1] } else { throw 'Could not find OTP in log' }

Write-Output "`n=== 4. verify-otp ==="
$ver = Post '/auth/verify-otp' @{ phone = '9876543210'; code = $code }
Write-Output ($ver | ConvertTo-Json -Depth 5)
$token = $ver.data.token
$auth = @{ Authorization = "Bearer $token" }

Write-Output "`n=== 4b. reuse the same OTP (must fail) ==="
try { Post '/auth/verify-otp' @{ phone = '9876543210'; code = $code } | Out-Null; Write-Output 'UNEXPECTED: reuse succeeded' }
catch { Write-Output "rejected: $($_.Exception.Response.StatusCode.value__)" }

Write-Output "`n=== 5. summary (empty) ==="
$sum = Invoke-RestMethod -Uri "$base/loans/summary" -Method Get -Headers $auth
Write-Output ($sum | ConvertTo-Json -Depth 5)

Write-Output "`n=== 6. create loan (invalid: negative amount) ==="
try { Post '/loans' @{ friendName = 'Amit'; amount = -50; dueDate = '2026-12-01' } -Headers $auth | Out-Null }
catch { Write-Output "rejected: $($_.Exception.Response.StatusCode.value__)" }

Write-Output "`n=== 7. create loan (valid) ==="
$loan = Post '/loans' @{ friendName = 'Amit'; amount = 1500.5; dueDate = '2026-12-01' } -Headers $auth
Write-Output ($loan | ConvertTo-Json -Depth 5)

Write-Output "`n=== 7b. create overdue loan (past due date) ==="
$past = (Get-Date).AddDays(-5).ToString('yyyy-MM-dd')
$loan2 = Post '/loans' @{ friendName = 'Priya'; amount = '500.25'; dueDate = $past } -Headers $auth
Write-Output ($loan2 | ConvertTo-Json -Depth 5)

Write-Output "`n=== 8. list loans ==="
$list = Invoke-RestMethod -Uri "$base/loans" -Method Get -Headers $auth
Write-Output ($list | ConvertTo-Json -Depth 5)

Write-Output "`n=== 9. summary ==="
$sum = Invoke-RestMethod -Uri "$base/loans/summary" -Method Get -Headers $auth
Write-Output ($sum | ConvertTo-Json -Depth 5)

Write-Output "`n=== 10. repay loan 1 ==="
$repay = Invoke-RestMethod -Uri "$base/loans/$($loan.data.loan.id)/repay" -Method Patch -Headers $auth
Write-Output ($repay | ConvertTo-Json -Depth 5)

Write-Output "`n=== 10b. repay again (must be 409) ==="
try { Invoke-RestMethod -Uri "$base/loans/$($loan.data.loan.id)/repay" -Method Patch -Headers $auth | Out-Null }
catch { Write-Output "rejected: $($_.Exception.Response.StatusCode.value__)" }

Write-Output "`n=== 11. summary after repay ==="
$sum = Invoke-RestMethod -Uri "$base/loans/summary" -Method Get -Headers $auth
Write-Output ($sum | ConvertTo-Json -Depth 5)

Write-Output "`n=== 12. second user cannot touch first user's loan ==="
$req2 = Post '/auth/request-otp' @{ phone = '9123456789' }
Start-Sleep -Seconds 31
$log2 = Get-Content $apiLog -Tail 40
$line2 = $log2 | Where-Object { $_ -match 'MOCK OTP' } | Select-Object -Last 1
if ($line2 -match 'code=(\d{6})') { $code2 = $Matches[1] } else { throw 'no otp2' }
$ver2 = Post '/auth/verify-otp' @{ phone = '9123456789'; code = $code2 }
$auth2 = @{ Authorization = "Bearer $($ver2.data.token)" }
Write-Output "user2 loans:"; (Invoke-RestMethod -Uri "$base/loans" -Method Get -Headers $auth2) | ConvertTo-Json -Depth 5
Write-Output "user2 summary:"; (Invoke-RestMethod -Uri "$base/loans/summary" -Method Get -Headers $auth2) | ConvertTo-Json -Depth 5
try { Invoke-RestMethod -Uri "$base/loans/$($loan.data.loan.id)/repay" -Method Patch -Headers $auth2 | Out-Null; Write-Output 'UNEXPECTED: cross-user repay succeeded' }
catch { Write-Output "cross-user repay rejected: $($_.Exception.Response.StatusCode.value__)" }
try { Invoke-RestMethod -Uri "$base/loans" -Method Get -Headers @{ Authorization = 'Bearer not-a-token' } | Out-Null }
catch { Write-Output "invalid token rejected: $($_.Exception.Response.StatusCode.value__)" }

Write-Output "`n=== DONE ==="

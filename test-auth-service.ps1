# test-auth-service.ps1
$BASE_URL = "http://localhost:4000/auth"

# FOLOSEsTE UN USER VERIFICAT
$EMAIL = "admin@example.com"
$PASSWORD = "admin123"

Write-Host "=== 1. Signup (poate esua cu 409 daca exista deja) ==="
$signupBody = @{ email = $EMAIL; password = $PASSWORD } | ConvertTo-Json
try {
  $signupResp = Invoke-RestMethod -Method POST -Uri "$BASE_URL/signup" -ContentType "application/json" -Body $signupBody
  $signupResp | ConvertTo-Json -Depth 5
} catch {
  $_.Exception.Response | Out-Null
  Write-Host "Signup poate esua (409) daca userul exista deja."
}
Write-Host "-------------------------"

Write-Host "=== 2. Login ==="
$loginBody = @{ email = $EMAIL; password = $PASSWORD } | ConvertTo-Json
try {
  $loginResp = Invoke-RestMethod -Method POST -Uri "$BASE_URL/login" -ContentType "application/json" -Body $loginBody
  $loginResp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Login a esuat. Cel mai probabil contul nu este verificat SAU captcha este activa."
  Write-Host "Asigura-te ca: 1) folosesti un user verificat, 2) CAPTCHA_ENABLED=false pentru test."
  exit 1
}
$TOKEN = $loginResp.token
Write-Host "DEBUG: Token extras = [$TOKEN]"
if ([string]::IsNullOrWhiteSpace($TOKEN)) {
  Write-Host "Nu s-a putut extrage tokenul din raspuns. Oprire."
  exit 1
}
$headers = @{ Authorization = "Bearer $TOKEN" }
Write-Host "-------------------------"

Write-Host "=== 3. Get Profile ==="
try {
  $profileResp = Invoke-RestMethod -Method GET -Uri "$BASE_URL/profile" -Headers $headers
  $profileResp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Profile a esuat: $($_.Exception.Message)"
}
Write-Host "-------------------------"

Write-Host "=== 4. Request Password Reset ==="
try {
  $resetReqResp = Invoke-RestMethod -Method POST -Uri "$BASE_URL/request-password-reset" -Headers $headers -ContentType "application/json"
  $resetReqResp | ConvertTo-Json -Depth 5
  Write-Host "(Token-ul de resetare vine pe email; pasul efectiv e manual)"
} catch {
  Write-Host "Request password reset a esuat: $($_.Exception.Message)"
}
Write-Host "-------------------------"

Write-Host "=== 5. Change Email ==="
try {
  $changeEmailBody = @{ currentPassword = $PASSWORD; newEmail = "newemail@example.com" } | ConvertTo-Json
  $changeEmailResp = Invoke-RestMethod -Method PUT -Uri "$BASE_URL/change-email" -Headers $headers -ContentType "application/json" -Body $changeEmailBody
  $changeEmailResp | ConvertTo-Json -Depth 5
  Write-Host "(Link-ul de confirmare vine pe noul email; pasul efectiv e manual)"
} catch {
  Write-Host "Change email a esuat: $($_.Exception.Message)"
}
Write-Host "-------------------------"

Write-Host "=== 6. Admin Panel (necesita rol admin) ==="
try {
  $adminResp = Invoke-RestMethod -Method GET -Uri "$BASE_URL/admin/panel" -Headers $headers
  $adminResp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Acces la admin/panel a esuat (probabil rolul nu este admin): $($_.Exception.Message)"
}
Write-Host "-------------------------"

Write-Host "=== TEST FINALIZAT ==="

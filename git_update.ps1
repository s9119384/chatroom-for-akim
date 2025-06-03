param(
    [string]$commitMsg = "Update"
)

Write-Host "開始 git add ..."
git add .

Write-Host "開始 git commit ..."
git commit -m "$commitMsg"

Write-Host "開始 git push ..."
git push origin main

Write-Host "開始 npm run deploy ..."
npm run deploy

Write-Host "所有動作完成！"

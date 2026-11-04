# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\download-belize-images.ps1
$out = "public\img\trips\belize"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$b = "https://cdn.shopify.com/s/files/1/0429/9751/4405/files"
$files = [ordered]@{
  "hopkins-bay.jpg"      = "$b/FN_belize_hopkinsbay-013.jpg"
  "best-of-belize.jpg"   = "$b/best-belize_1.jpg"
  "jaguar-reef.jpg"      = "$b/Day_1_Jaguar_Reef_Hotel_Belize_1.jpg"
  "jaguar-reef-pool.jpg" = "$b/Day_1_Jaguar_Reef_Hotel_Belize_1_1_1.jpg"
  "hopkins.jpg"          = "$b/DAY_1_-_Hopkins.jpg"
  "cave-tubing.jpg"      = "$b/day3.jpg"
  "dangriga.jpg"         = "$b/day4.jpg"
  "caye-caulker.jpg"     = "$b/day5.jpg"
  "shark-ray-alley.jpg"  = "$b/day6.jpg"
  "relax.jpg"            = "$b/day7.jpg"
  "departure.png"        = "$b/Screenshot_1_b9ac2fbb-6f02-4e20-b0fa-4c20c39de521.png"
  "hotel-1.png"          = "$b/Screenshot_5_097911a2-4e17-4cf6-86b5-1f52f5a56e1b.png"
  "hotel-2.png"          = "$b/Screenshot_6_54b63eb1-99d4-4653-9616-3a4673247e76.png"
}
function Get-Image($name, $url) {
  try { Invoke-WebRequest -Uri $url -OutFile "$out\$name" -UseBasicParsing; Write-Host "ok  $name" }
  catch { Write-Host "FAIL $name  $($_.Exception.Message)" -ForegroundColor Red }
}
Get-Image "cover.jpg" "https://itaglobal.com/cdn/shop/products/Belize-Family-_-Friends-Vacation_60aa4245-393f-4603-8970-1bdc0e0d43e9.jpg"
foreach ($file in $files.Keys) {
  $url = $files[$file]
  $base = [IO.Path]::GetFileNameWithoutExtension($file)
  $ext = [IO.Path]::GetExtension($file)
  Get-Image $file $url
  Get-Image "$base-800$ext" "$($url)?width=800"
  Get-Image "$base-1600$ext" "$($url)?width=1600"
}
Get-Image "hopkins-bay-2400.jpg" "$($files['hopkins-bay.jpg'])?width=2400"
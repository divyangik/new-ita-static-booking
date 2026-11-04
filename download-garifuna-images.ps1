# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\download-garifuna-images.ps1
$out = "public\img\trips\garifuna"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$b = "https://cdn.shopify.com/s/files/1/0429/9751/4405/files"
$files = [ordered]@{
  "jaguar-reef-drone.jpg"   = "$b/JAGUAR-REEF-DRONE-0146.jpg"
  "jaguar-reef.jpg"         = "$b/Jaguar-reef-MonicaGallardoPhotography72.jpg"
  "hopkins-aerial.jpg"      = "$b/hopkins-belize-aerial-resized-web.jpg"
  "hopkins-village.jpg"     = "$b/hopkins-belize_db87c63e-10e3-4100-b1b7-16b7aaf7c3db.jpg"
  "dangriga-drums.jpg"      = "$b/40szppokhpfl1_l.jpg"
  "dangriga-history.jpg"    = "$b/history-of-dangriga-and-stann-creek.jpg"
  "xunantunich.jpg"         = "$b/alisa-matthews-l2NuLvqYxhU-unsplash_f7395724-dad1-469f-a3e2-50ecf0e9cb51.jpg"
  "blue-hole.jpg"           = "$b/laura-labrie-lY266DcYm78-unsplash_7627340c-0d99-4945-9cb1-22d07dd95d2e.jpg"
  "hopkins-beach.jpg"       = "$b/hopkins-belize-scaled-e1595858978429-1200x800.jpg"
  "departure.jpg"           = "$b/Copy_of_FN_belize_hopkinsbay-002.jpg"
  "seaview-villa.jpg"       = "$b/New-Seaview-Villas-with-Plunge-Pool-at-Jaguar-Reef-3.jpg"
  "jaguar-reef-grounds.jpg" = "$b/JAGUAR-REEF-1238-1500x1000.jpg"
  "jaguar-reef-lodge.jpg"   = "$b/0_pgNuxZ0LJK2VqLo3.jpg"
}
function Get-Image($name, $url) {
  try { Invoke-WebRequest -Uri $url -OutFile "$out\$name" -UseBasicParsing; Write-Host "ok  $name" }
  catch { Write-Host "FAIL $name  $($_.Exception.Message)" -ForegroundColor Red }
}
Get-Image "cover.jpg" "https://itaglobal.com/cdn/shop/files/COVERAFROBELIZEGARIFUNAEXPERIENCE.jpg"
foreach ($file in $files.Keys) {
  $url = $files[$file]
  $base = [IO.Path]::GetFileNameWithoutExtension($file)
  $ext = [IO.Path]::GetExtension($file)
  Get-Image $file $url
  Get-Image "$base-800$ext" "$($url)?width=800"
  Get-Image "$base-1600$ext" "$($url)?width=1600"
}
Get-Image "jaguar-reef-drone-2400.jpg" "$($files['jaguar-reef-drone.jpg'])?width=2400"
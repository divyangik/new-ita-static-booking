$out = "public\img\trips\japan"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$b = "https://cdn.shopify.com/s/files/1/0429/9751/4405/files"
$files = [ordered]@{
  "cover.jpg"          = "https://itaglobal.com/cdn/shop/files/COVERJAPANAJOURNEYTHROUGHCULTURALDEPTH_TIMELESSELEGANCE.jpg"
  "tokyo-arrival.jpg"  = "$b/New_Project_-_2026-04-27T133200.849.jpg"
  "tokyo-temple.jpg"   = "$b/Tokyo_Temple.jpg"
  "senso-ji-gate.jpg"  = "$b/Majestic_Senso-ji_Temple_Gate_in_Tokyo_1.jpg"
  "tokyo-food.jpg"     = "$b/pexels-ddou-dou-2163061-12150737.jpg"
  "hakone-torii.jpg"   = "$b/Hakone_Shrine_s_Red_Torii.jpg"
  "osaka-food.jpg"     = "$b/OSAKA_FOOD.jpg"
  "nara-deer.jpg"      = "$b/Young_Deer_in_Nara_Park_near_Stone_Lantern.jpg"
  "kyoto.jpg"          = "$b/kyoto.jpg"
  "tea-ceremony.jpg"   = "$b/Private_tea_ceremony.jpg"
  "kyoto-yasaka.jpg"   = "$b/Kyoto_Yasaka_Shrine_Area.jpg"
  "departure.jpg"      = "$b/Smooth_and_reliable_departure_flow.jpg"
  "hotel-tokyo.jpg"    = "$b/faci_04.jpg"
  "hotel-hakone.jpg"   = "$b/HAKHR-P0972-Living-Room-Fireplace-Seating.16x9.jpg"
  "hotel-kyoto.jpg"    = "$b/PublicSpace2.jpg"
}
foreach ($name in $files.Keys) {
  try { Invoke-WebRequest -Uri $files[$name] -OutFile "$out\$name" -UseBasicParsing; Write-Host "ok  $name" }
  catch { Write-Host "FAIL $name  $($_.Exception.Message)" -ForegroundColor Red }
}
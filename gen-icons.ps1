Add-Type -AssemblyName System.Drawing

# Icon 192
$bmp = New-Object System.Drawing.Bitmap(192,192)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(10,10,12))
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220,38,38))
$font = New-Object System.Drawing.Font('Arial', 100, [System.Drawing.FontStyle]::Bold)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$rect = New-Object System.Drawing.RectangleF(0,0,192,192)
$g.DrawString('Y', $font, $brush, $rect, $sf)
$bmp.Save("$PSScriptRoot\public\icon-192.png")
$g.Dispose()
$bmp.Dispose()

# Icon 512
$bmp2 = New-Object System.Drawing.Bitmap(512,512)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.Clear([System.Drawing.Color]::FromArgb(10,10,12))
$font2 = New-Object System.Drawing.Font('Arial', 260, [System.Drawing.FontStyle]::Bold)
$rect2 = New-Object System.Drawing.RectangleF(0,0,512,512)
$g2.DrawString('Y', $font2, $brush, $rect2, $sf)
$bmp2.Save("$PSScriptRoot\public\icon-512.png")
$g2.Dispose()
$bmp2.Dispose()

Write-Host "Icons generated!"

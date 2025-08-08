#!/usr/bin/env python3
"""
Favicon Generator for AI Document Assistant
Generates various favicon sizes from SVG source
"""

import os
import subprocess
from pathlib import Path

# Favicon sizes to generate
FAVICON_SIZES = [
    (16, 16, 'favicon-16x16.png'),
    (32, 32, 'favicon-32x32.png'),
    (48, 48, 'favicon-48x48.png'),
    (64, 64, 'favicon-64x64.png'),
    (96, 96, 'favicon-96x96.png'),
    (128, 128, 'favicon-128x128.png'),
    (180, 180, 'apple-touch-icon.png'),
    (192, 192, 'favicon-192x192.png'),
    (256, 256, 'favicon-256x256.png'),
    (512, 512, 'favicon-512x512.png'),
]

def create_simple_favicon_ico():
    """Create a simple favicon.ico using text-based approach"""
    favicon_content = '''
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="15" fill="#007bff"/>
      <rect x="8" y="6" width="10" height="13" rx="1" fill="white" opacity="0.9"/>
      <rect x="9" y="8" width="8" height="1" fill="#007bff" opacity="0.7"/>
      <rect x="9" y="10" width="6" height="0.8" fill="#007bff" opacity="0.5"/>
      <rect x="9" y="12" width="7" height="0.8" fill="#007bff" opacity="0.5"/>
      <circle cx="22" cy="10" r="1.5" fill="#28a745" opacity="0.8"/>
      <circle cx="24" cy="14" r="1" fill="#28a745" opacity="0.6"/>
      <text x="16" y="26" font-family="Arial" font-size="4" font-weight="bold" text-anchor="middle" fill="white">AI</text>
    </svg>
    '''
    
    # Write SVG to temporary file
    with open('temp_favicon.svg', 'w') as f:
        f.write(favicon_content)
    
    return 'temp_favicon.svg'

def generate_png_from_svg(svg_file, width, height, output_file):
    """Generate PNG from SVG using available tools"""
    frontend_dir = Path('frontend/src')
    output_path = frontend_dir / output_file
    
    # Try different methods to convert SVG to PNG
    methods = [
        # Method 1: Using rsvg-convert (if available)
        f'rsvg-convert -w {width} -h {height} {svg_file} -o {output_path}',
        # Method 2: Using ImageMagick convert (if available)
        f'convert -background transparent -size {width}x{height} {svg_file} {output_path}',
        # Method 3: Using Inkscape (if available)
        f'inkscape --export-png={output_path} --export-width={width} --export-height={height} {svg_file}',
    ]
    
    for method in methods:
        try:
            result = subprocess.run(method.split(), capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Generated {output_file} ({width}x{height})")
                return True
        except FileNotFoundError:
            continue
    
    print(f"❌ Could not generate {output_file} - no suitable converter found")
    return False

def create_fallback_files():
    """Create fallback favicon files using simple HTML/CSS approach"""
    frontend_dir = Path('frontend/src')
    
    # Create a simple favicon.ico placeholder
    favicon_html = '''
    <!-- This is a placeholder. For production, use a proper favicon.ico -->
    <!-- You can generate one at https://favicon.io/ using the SVG above -->
    '''
    
    # Create basic PNG files using CSS/HTML (for development)
    print("📝 Creating fallback favicon files...")
    
    # Create empty placeholder files that browsers can handle
    for width, height, filename in FAVICON_SIZES:
        filepath = frontend_dir / filename
        if not filepath.exists():
            # Create a minimal PNG placeholder (1x1 transparent pixel)
            # This is just a placeholder - in production you'd want proper icons
            with open(filepath, 'wb') as f:
                # Minimal PNG header for 1x1 transparent pixel
                png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
                f.write(png_data)
            print(f"📝 Created placeholder {filename}")

def main():
    """Main function to generate all favicon files"""
    print("🎨 Generating favicons for AI Document Assistant...")
    
    # Ensure frontend/src directory exists
    frontend_dir = Path('frontend/src')
    frontend_dir.mkdir(parents=True, exist_ok=True)
    
    # Create simple SVG favicon
    svg_file = create_simple_favicon_ico()
    
    # Try to generate PNG files from SVG
    success_count = 0
    for width, height, filename in FAVICON_SIZES:
        if generate_png_from_svg(svg_file, width, height, filename):
            success_count += 1
    
    # If no converter was available, create fallback files
    if success_count == 0:
        print("⚠️  No SVG converter found. Creating fallback files...")
        create_fallback_files()
        print("\n📋 To create proper favicons:")
        print("1. Visit https://favicon.io/favicon-converter/")
        print("2. Upload the favicon.svg file")
        print("3. Download the generated files")
        print("4. Replace the placeholder files in frontend/src/")
    
    # Clean up temporary file
    if os.path.exists('temp_favicon.svg'):
        os.remove('temp_favicon.svg')
    
    print(f"\n✅ Favicon generation complete!")
    print(f"📁 Files created in: {frontend_dir.absolute()}")

if __name__ == "__main__":
    main()

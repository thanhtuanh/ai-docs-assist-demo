#!/usr/bin/env python3
"""
Create a simple favicon.ico file for AI Document Assistant
"""

import struct
import base64
from pathlib import Path

def create_simple_favicon_ico():
    """Create a simple 16x16 favicon.ico file"""
    
    # Simple 16x16 icon data (blue circle with white document and "AI" text)
    # This is a simplified approach - in production you'd want a proper icon
    
    # ICO file header
    ico_header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type, Count
    
    # ICO directory entry
    ico_dir = struct.pack('<BBBBHHLL', 
                         16,    # Width
                         16,    # Height  
                         0,     # Color count
                         0,     # Reserved
                         1,     # Planes
                         32,    # Bits per pixel
                         0,     # Image size (will be updated)
                         22)    # Offset to image data
    
    # Create a simple 16x16 RGBA bitmap
    # Blue background with white document shape
    pixels = []
    for y in range(16):
        for x in range(16):
            # Create a circular blue background
            dx, dy = x - 8, y - 8
            if dx*dx + dy*dy <= 64:  # Circle radius ~8
                if 4 <= x <= 11 and 3 <= y <= 11:  # Document area
                    if y == 3 or y == 11 or x == 4 or x == 11:  # Document border
                        pixels.extend([255, 255, 255, 255])  # White
                    elif 5 <= x <= 10 and y in [5, 7, 9]:  # Text lines
                        pixels.extend([0, 123, 255, 255])    # Blue text
                    else:
                        pixels.extend([255, 255, 255, 200])  # Light white
                else:
                    pixels.extend([0, 123, 255, 255])        # Blue background
            else:
                pixels.extend([0, 0, 0, 0])                  # Transparent
    
    # BMP header for the icon
    bmp_header = struct.pack('<LLLHHLLLLLL',
                            40,     # Header size
                            16,     # Width
                            32,     # Height (doubled for ICO)
                            1,      # Planes
                            32,     # Bits per pixel
                            0,      # Compression
                            0,      # Image size
                            0,      # X pixels per meter
                            0,      # Y pixels per meter
                            0,      # Colors used
                            0)      # Important colors
    
    # Combine pixel data (need to flip vertically for BMP)
    flipped_pixels = []
    for y in range(15, -1, -1):  # Flip vertically
        for x in range(16):
            idx = (y * 16 + x) * 4
            flipped_pixels.extend(pixels[idx:idx+4])
    
    # Create the complete image data
    image_data = bmp_header + bytes(flipped_pixels)
    
    # Update the image size in the directory entry
    image_size = len(image_data)
    ico_dir = struct.pack('<BBBBHHLL', 16, 16, 0, 0, 1, 32, image_size, 22)
    
    # Combine all parts
    ico_data = ico_header + ico_dir + image_data
    
    return ico_data

def main():
    """Create the favicon.ico file"""
    print("🎨 Creating favicon.ico for AI Document Assistant...")
    
    # Create the ICO data
    ico_data = create_simple_favicon_ico()
    
    # Write to file
    favicon_path = Path('frontend/src/favicon.ico')
    favicon_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(favicon_path, 'wb') as f:
        f.write(ico_data)
    
    print(f"✅ Created favicon.ico ({len(ico_data)} bytes)")
    print(f"📁 Location: {favicon_path.absolute()}")

if __name__ == "__main__":
    main()

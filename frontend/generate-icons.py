#!/usr/bin/env python3
"""
Generate icon files from logo.jpeg
Requires: pip install Pillow
"""

from PIL import Image
import os

def generate_icons():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, 'public')
    logo_path = os.path.join(public_dir, 'logo.jpeg')
    
    if not os.path.exists(logo_path):
        print(f"❌ Error: logo.jpeg not found at {logo_path}")
        return
    
    print("Generating icons from logo.jpeg...")
    
    # Open the logo
    logo = Image.open(logo_path)
    
    # Convert to RGBA if needed
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
    
    # Generate 192x192 PNG for PWA
    icon_192 = logo.copy()
    icon_192.thumbnail((192, 192), Image.Resampling.LANCZOS)
    
    # Create white background
    bg_192 = Image.new('RGBA', (192, 192), (255, 255, 255, 255))
    # Center the logo
    offset = ((192 - icon_192.width) // 2, (192 - icon_192.height) // 2)
    bg_192.paste(icon_192, offset, icon_192)
    bg_192.convert('RGB').save(os.path.join(public_dir, 'logo192.png'), 'PNG')
    print("✓ Generated logo192.png")
    
    # Generate 512x512 PNG for PWA
    icon_512 = logo.copy()
    icon_512.thumbnail((512, 512), Image.Resampling.LANCZOS)
    
    # Create white background
    bg_512 = Image.new('RGBA', (512, 512), (255, 255, 255, 255))
    # Center the logo
    offset = ((512 - icon_512.width) // 2, (512 - icon_512.height) // 2)
    bg_512.paste(icon_512, offset, icon_512)
    bg_512.convert('RGB').save(os.path.join(public_dir, 'logo512.png'), 'PNG')
    print("✓ Generated logo512.png")
    
    # Generate favicon.ico (multiple sizes in one file)
    icon_16 = logo.copy()
    icon_16.thumbnail((16, 16), Image.Resampling.LANCZOS)
    bg_16 = Image.new('RGBA', (16, 16), (255, 255, 255, 255))
    offset = ((16 - icon_16.width) // 2, (16 - icon_16.height) // 2)
    bg_16.paste(icon_16, offset, icon_16)
    
    icon_32 = logo.copy()
    icon_32.thumbnail((32, 32), Image.Resampling.LANCZOS)
    bg_32 = Image.new('RGBA', (32, 32), (255, 255, 255, 255))
    offset = ((32 - icon_32.width) // 2, (32 - icon_32.height) // 2)
    bg_32.paste(icon_32, offset, icon_32)
    
    icon_48 = logo.copy()
    icon_48.thumbnail((48, 48), Image.Resampling.LANCZOS)
    bg_48 = Image.new('RGBA', (48, 48), (255, 255, 255, 255))
    offset = ((48 - icon_48.width) // 2, (48 - icon_48.height) // 2)
    bg_48.paste(icon_48, offset, icon_48)
    
    # Save as ICO with multiple sizes
    bg_32.convert('RGB').save(
        os.path.join(public_dir, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("✓ Generated favicon.ico")
    
    print("\n✅ Icon generation complete!")

if __name__ == '__main__':
    try:
        generate_icons()
    except ImportError:
        print("❌ Error: Pillow package not found.")
        print("\nPlease install Pillow first:")
        print("  pip install Pillow")
        print("\nThen run this script again:")
        print("  python3 generate-icons.py")
    except Exception as e:
        print(f"❌ Error: {e}")

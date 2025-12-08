# Tesseract OCR Installation Guide

## Overview

The OCR feature requires Tesseract OCR to be installed on your system. This guide provides step-by-step instructions for installing Tesseract on different operating systems.

## Windows Installation

### Method 1: Using the Official Installer (Recommended)

1. **Download Tesseract**
   - Go to: https://github.com/UB-Mannheim/tesseract/wiki
   - Download the latest version for Windows (64-bit recommended)
   - Choose the installer that matches your system architecture

2. **Install Tesseract**
   - Run the downloaded installer
   - **Important**: Install to `C:\Program Files\Tesseract-OCR\` (default location)
   - Make sure to check "Add to PATH" during installation
   - Complete the installation

3. **Verify Installation**
   - Open Command Prompt or PowerShell
   - Run: `tesseract --version`
   - You should see version information if installed correctly

### Method 2: Using Chocolatey (Alternative)

```powershell
# Install Chocolatey first if not already installed
# Then run:
choco install tesseract
```

### Method 3: Using Winget (Windows 10/11)

```powershell
winget install UB-Mannheim.TesseractOCR
```

## Linux Installation

### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install Tesseract OCR
sudo apt install tesseract-ocr

# Install additional language packs (optional)
sudo apt install tesseract-ocr-eng  # English
sudo apt install tesseract-ocr-ara  # Arabic
sudo apt install tesseract-ocr-hin  # Hindi
sudo apt install tesseract-ocr-urd  # Urdu

# Verify installation
tesseract --version
```

### CentOS/RHEL/Fedora

```bash
# CentOS/RHEL
sudo yum install tesseract

# Fedora
sudo dnf install tesseract

# Install additional language packs
sudo yum install tesseract-langpack-eng
sudo yum install tesseract-langpack-ara
```

### Arch Linux

```bash
sudo pacman -S tesseract
sudo pacman -S tesseract-data-eng
sudo pacman -S tesseract-data-ara
```

## macOS Installation

### Using Homebrew (Recommended)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Tesseract
brew install tesseract

# Install additional language packs
brew install tesseract-lang

# Verify installation
tesseract --version
```

### Using MacPorts

```bash
sudo port install tesseract
sudo port install tesseract-eng
sudo port install tesseract-ara
```

## Docker Installation (Alternative)

If you prefer to use Docker, you can run Tesseract in a container:

```bash
# Pull the Tesseract Docker image
docker pull tesseractshadow/tesseract4re

# Run Tesseract container
docker run -it --rm -v $(pwd):/workspace tesseractshadow/tesseract4re tesseract --version
```

## Verification

After installation, verify that Tesseract is working:

### Command Line Test

```bash
# Test basic functionality
tesseract --version

# Test OCR on a sample image (if you have one)
tesseract sample.png stdout
```

### Python Test

```python
import pytesseract
from PIL import Image

# Test if pytesseract can find Tesseract
print(pytesseract.get_tesseract_version())
```

## Troubleshooting

### Common Issues

#### 1. "tesseract is not installed or it's not in your PATH"

**Solution:**
- Ensure Tesseract is installed correctly
- Add Tesseract to your system PATH
- Restart your terminal/command prompt after installation

**Windows PATH Fix:**
1. Open System Properties → Advanced → Environment Variables
2. Add `C:\Program Files\Tesseract-OCR\` to the PATH variable
3. Restart your terminal

#### 2. Language Pack Issues

**Solution:**
- Install the required language packs
- For Arabic text: `sudo apt install tesseract-ocr-ara` (Linux)
- For Windows: Download language data files from the Tesseract GitHub

#### 3. Permission Issues (Linux/macOS)

**Solution:**
```bash
# Check if tesseract is executable
ls -la $(which tesseract)

# Fix permissions if needed
sudo chmod +x $(which tesseract)
```

#### 4. Python pytesseract Issues

**Solution:**
```python
# Set the Tesseract path manually in your code
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows
# or
pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'  # Linux/macOS
```

### Performance Optimization

#### 1. Install Additional Language Packs

For better accuracy with different languages:

```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr-all

# macOS
brew install tesseract-lang
```

#### 2. Configure Tesseract Settings

Create a custom configuration file for better results:

```bash
# Create config file
echo "tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" > tessdata/configs/custom_config
```

## Testing the OCR Feature

After installing Tesseract:

1. **Start the Flask application:**
   ```bash
   python app.py
   ```

2. **Run the test script:**
   ```bash
   python test_ocr.py
   ```

3. **Test in the web interface:**
   - Navigate to the Products section
   - Click the "OCR Scanner" button
   - Upload an image with text
   - Verify text extraction works

## Language Support

Tesseract supports many languages. To install additional languages:

### Windows
- Download language data files from: https://github.com/tesseract-ocr/tessdata
- Place them in the `tessdata` folder in your Tesseract installation

### Linux
```bash
# List available language packs
apt search tesseract-ocr-

# Install specific languages
sudo apt install tesseract-ocr-eng  # English
sudo apt install tesseract-ocr-ara  # Arabic
sudo apt install tesseract-ocr-hin  # Hindi
sudo apt install tesseract-ocr-urd  # Urdu
sudo apt install tesseract-ocr-chi-sim  # Chinese Simplified
sudo apt install tesseract-ocr-jpn  # Japanese
```

### macOS
```bash
# Install all languages
brew install tesseract-lang
```

## Next Steps

After successful installation:

1. **Test the OCR feature** in the web interface
2. **Try different image types** (printed text, handwritten, etc.)
3. **Check the confidence scores** to understand accuracy
4. **Optimize images** for better results (good lighting, contrast, etc.)

## Support

If you encounter issues:

1. Check the application logs for detailed error messages
2. Verify Tesseract installation with `tesseract --version`
3. Test with simple images first
4. Ensure proper file permissions and PATH settings

For additional help, refer to:
- Tesseract Documentation: https://tesseract-ocr.github.io/
- pytesseract Documentation: https://pypi.org/project/pytesseract/
- Application logs in the `logs/` directory

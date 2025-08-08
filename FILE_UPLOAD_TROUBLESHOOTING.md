# 🔧 File Upload Troubleshooting Guide

## 🚨 Issue: File shows 0.00 MB

If you're seeing "📎 bits-tech-projekt.pdf 0.00 MB", this indicates a file handling issue.

## 🔍 Possible Causes & Solutions

### 1. **Empty or Corrupted File**
**Symptoms**: File size shows as 0 Bytes
**Solutions**:
- Check if the original file actually contains content
- Try opening the file in a PDF viewer to verify it's not corrupted
- Re-download or re-create the file if necessary

### 2. **Browser File API Issues**
**Symptoms**: File appears to load but shows 0 size
**Solutions**:
- Clear browser cache and cookies
- Try a different browser (Chrome, Firefox, Safari)
- Disable browser extensions that might interfere with file uploads
- Check browser console for JavaScript errors

### 3. **File System Permissions**
**Symptoms**: File can't be read properly
**Solutions**:
- Ensure the file has proper read permissions
- Try copying the file to a different location
- Check if the file is locked by another application

### 4. **Network/Proxy Issues**
**Symptoms**: File selection works but upload fails
**Solutions**:
- Disable VPN or proxy temporarily
- Check firewall settings
- Try from a different network connection

## 🛠️ Debugging Steps

### Step 1: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Select the file and look for error messages
4. Look for logs starting with "File selected:" or "File validation"

### Step 2: Verify File Properties
The improved interface now shows:
- ✅ File name
- ✅ File size (with warning if 0 bytes)
- ✅ File type
- ✅ Validation status

### Step 3: Test with Different Files
Try uploading:
- A simple text file (.txt)
- A small PDF file (< 1MB)
- Different file formats to isolate the issue

### Step 4: Check File Content
For text files, the system now previews content to verify readability.

## 🔧 New Features Added

### Enhanced File Validation
```typescript
// Now checks for:
- File size (0 bytes = error)
- File type validation
- File name length
- Content readability (for text files)
- PDF integrity (basic check)
```

### Better Error Messages
- ❌ "Die ausgewählte Datei ist leer (0 Bytes)"
- ❌ "Die Datei ist zu groß (X MB). Maximale Größe: 10 MB"
- ❌ "Dateityp wird nicht unterstützt"
- ❌ "Die PDF-Datei scheint beschädigt zu sein"

### File Preview & Validation
- Text files: Content preview in console
- PDF files: ArrayBuffer validation
- All files: Size and type verification

### Improved UI
- File details display (name, size, type)
- Clear file button
- Visual warnings for problematic files
- Disabled upload button for invalid files

## 📋 Supported File Types

| Format | MIME Type | Max Size | Notes |
|--------|-----------|----------|-------|
| PDF | application/pdf | 10 MB | Must be valid PDF |
| TXT | text/plain | 10 MB | UTF-8 encoding |
| DOC | application/msword | 10 MB | Legacy Word |
| DOCX | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 10 MB | Modern Word |
| CSV | text/csv | 10 MB | Comma-separated |
| JSON | application/json | 10 MB | Valid JSON |
| MD | text/markdown | 10 MB | Markdown |

## 🚀 Quick Fixes

### If file shows 0.00 MB:
1. **Clear and re-select** the file using the "🗑️ Datei entfernen" button
2. **Check file properties** in your file system
3. **Try a different file** to test if it's file-specific
4. **Check browser console** for detailed error messages

### If upload fails:
1. **Verify file size** is under 10 MB
2. **Check file type** is supported
3. **Test network connection** 
4. **Try different browser**

## 🔍 Advanced Debugging

### Browser Console Commands
```javascript
// Check file input element
document.querySelector('input[type="file"]').files[0]

// Check if FileReader API is available
typeof FileReader !== 'undefined'

// Test file reading
const file = document.querySelector('input[type="file"]').files[0];
const reader = new FileReader();
reader.onload = e => console.log('File content length:', e.target.result.length);
reader.readAsText(file);
```

### Network Tab Analysis
1. Open Developer Tools → Network tab
2. Try uploading a file
3. Look for failed requests or CORS errors
4. Check request/response headers

## 📞 Still Having Issues?

If the problem persists:

1. **Document the exact error** (screenshot + console logs)
2. **Note your browser** and version
3. **Try the same file** on a different device
4. **Check if other file types** work
5. **Test with a minimal file** (empty .txt file with just "test" content)

The enhanced validation and debugging features should help identify the specific cause of the 0.00 MB issue.

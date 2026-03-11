# Uploads Directory

## Overview
This directory stores all uploaded files (images, documents, etc.) for the JutaGhar application.

## Important Notes

### File Storage Strategy
- **Physical files** are stored in this directory
- **Only metadata** (file paths, names, sizes, types) is stored in the MongoDB database
- Files are **NOT** stored as binary data in the database

### Directory Structure
```
uploads/
├── products/          # Product images
├── users/            # User avatars and documents
├── orders/           # Order-related documents
└── temp/             # Temporary uploads (cleaned periodically)
```

### Security
- All files are served through Express static middleware
- Access control is handled at the API route level
- Files are served at `/uploads/*` endpoint

### Configuration
- Directory path is configured via `UPLOAD_DIR` in `.env`
- Default: `./uploads` (relative to backend root)
- Production: Use absolute path like `/var/www/uploads`

### Backup
Remember to include this directory in your backup strategy as it contains user-uploaded content.

### Development
- This directory is git-ignored (except this README and .gitkeep)
- Uploaded files during development are not committed to version control

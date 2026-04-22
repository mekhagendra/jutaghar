# Uploads Directory

## Overview
Images are no longer stored on the local filesystem. Product, category, brand, and hero images are uploaded to Cloudinary, and MongoDB stores only the resulting image URLs.

## Current Status
- This folder is kept only as a legacy placeholder so existing repo structure and gitignore rules remain stable.
- The backend no longer writes new uploads into this directory.
- There is no `/uploads/*` static serving path in the API anymore.

## Configuration
- Configure Cloudinary in `.env` with `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Optionally set `CLOUDINARY_FOLDER` to control the folder prefix used for uploaded assets.

## Database Storage
- MongoDB stores image URL strings only.
- No image binaries or local file payloads are saved in the database.

# Design Note: Local Folder Selection in DBConvert Streams UI

## Problem
Users need to select a **local folder** where data files (CSV, JSONL, Parquet, etc.) will be read from or written to.  
- **Typing absolute paths manually** is not user-friendly.  
- **Browser security** prevents direct access to the file system (no reliable absolute paths).  
- We want a **cross-browser solution** (must work in Chrome, Firefox, Safari, Edge).  

## Decision
Implement a **server-side file browser** (Jupyter/Airbyte style) that allows the user to navigate the local filesystem and select a folder.  
- The backend (running locally with the UI) provides folder listings and path validation.  
- The frontend renders a file explorer UI.  
- On confirmation, the selected path string is passed to the backend for use in pipelines.  

This avoids reliance on experimental APIs like **File System Access API** (not supported in Firefox/Safari).

## API Contract (Backend → Go service)

1. **List directory contents**
```
GET /fs/list?path=/home/user
→ {
  "path": "/home/user",
  "entries": [
    { "name": "Documents", "path": "/home/user/Documents", "type": "dir" },
    { "name": "file.csv", "path": "/home/user/file.csv", "type": "file" }
  ]
}
```

2. **Check if folder is writable**
```
POST /fs/writable
{ "path": "/home/user/Documents" }
→ { "ok": true, "error": null }
```

3. **Optional: Resolve shortcuts / roots**
```
GET /fs/roots
→ [ "/home/user/Documents", "/home/user/Downloads" ]
```

## Security Considerations
- Only allow navigation inside configured **root directories** (`ALLOWED_ROOTS=/home/user,/data`).  
- Reject `..` traversal or access outside roots.  
- Prevent exposing hidden system folders by default (e.g., `/etc`, `/proc`).  

## Frontend Behavior
- Button: **“Choose Folder”** → opens modal explorer.  
- Explorer features:  
  - Breadcrumb navigation (`/home/user/Documents`)  
  - List of folders/files (double-click to drill down, files shown but disabled)  
  - “Select this folder” button → closes modal and saves path.  
- Show chosen folder path in read-only text field.  
- Provide **Quick Access shortcuts**: Documents, Downloads, Desktop (from `/fs/roots`).  

## User Flow
1. User clicks **Choose Folder**.  
2. Modal opens with file tree.  
3. User navigates and selects a folder.  
4. Path is validated (`/fs/writable`).  
5. Path is saved into stream configuration (used for reading/writing files).  

## Out of Scope
- **Client-side File System Access API** (too limited cross-browser).  
- **Browser extensions / desktop helper apps** (over-engineering).  
- **Absolute path disclosure in browser** (not needed, backend already knows).  

---

✅ **Summary**: Implement a **server-side file browser** API + modal UI for folder selection. This is secure, cross-browser, and consistent with how JupyterLab / Airbyte solve the same problem.  

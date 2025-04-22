# WordPress XML to Markdown Converter

A tool that efficiently converts large WordPress XML export files (30MB+) to properly formatted Markdown documents.

## Features

- Handles large WordPress XML export files (30MB+)
- Converts WordPress content to clean, properly formatted Markdown
- Supports WordPress custom fields and taxonomies
- Provides batch processing for efficient conversion
- Offers custom Markdown formatting options
- Handles WordPress media attachments
- Includes Git-based version tracking

## Getting Started

### Prerequisites

- Node.js 18 or higher
- NPM or Yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/wordpress-to-markdown.git
cd wordpress-to-markdown
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

## Usage

1. Upload your WordPress XML export file (can be exported from WordPress admin → Tools → Export)
2. Configure conversion options
3. Wait for the conversion to complete
4. Preview and download the converted Markdown files

## Git Versioning System

This project includes an automatic versioning system to track changes using Git.

### Manual Versioning

To commit changes with automatic version increments:

```bash
node scripts/commit-version.js "Your commit message" [version-type]
```

Where `version-type` can be:
- `patch` (default): Increments the patch version (e.g., 1.0.0 → 1.0.1)
- `minor`: Increments the minor version (e.g., 1.0.0 → 1.1.0)
- `major`: Increments the major version (e.g., 1.0.0 → 2.0.0)

### Setting Up a Remote Repository

To configure a remote Git repository:

```bash
node scripts/setup-git-remote.js https://github.com/yourusername/your-repo.git
```

This will set up the remote repository and attempt to push using the GitHub token if configured.

## License

MIT
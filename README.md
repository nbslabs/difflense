# DiffLens

A clean, secure, and privacy-focused git diff viewer that processes everything client-side.

## Features

- **Privacy First**: All processing happens locally in your browser
- **Lightning Fast**: No server round trips required
- **Clean Interface**: Beautiful, easy-to-read diff visualization
- **Responsive Design**: Works perfectly on all devices
- **Multiple View Modes**: Side-by-side and unified diff views
- **File Navigation Sidebar**: Quick navigation for diffs with multiple files (sticky/fixed)
- **Collapsible Files**: Expand/collapse individual files or all at once
- **Customizable Display**: Settings to control how diffs are displayed
- **File Support**: Upload diff files or paste content directly
- **Syntax Highlighting**: Clean code highlighting with line numbers
- **Smart File Stats**: View additions and deletions per file
- **Open Source**: Free and open source forever

## Live Demo

Visit [DiffLens](https://difflense.nbslabs.dev) to try it out!

## Local Development

DiffLens is a static website project. To run it locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/nbslabs/difflense.git
   cd difflense
   ```

2. Serve the files using any web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open your browser and navigate to `http://localhost:8000`

## Self-Hosting with Docker

Run DiffLens anywhere Docker is available using the published container image.

### Use the published image

```bash
docker run -d \
   --name difflense \
   -p 8080:80 \
   ghcr.io/nbslabs/difflense:latest
```

Then open `http://localhost:8080` in your browser.

### Build the image yourself

```bash
docker build -t difflense:local .
docker run -d --name difflense-local -p 8080:80 difflense:local
```

To customize the static content, edit the files in this repository and rebuild the image.

## How to Use

1. **Generate a diff**: Run `git diff` in your repository
2. **Upload or paste**: Copy the diff output or upload a diff file
3. **Choose view mode**: Select unified or side-by-side view
4. **Navigate files**: Use the sidebar to quickly jump to specific files
5. **Analyze changes**: Review your code changes with syntax highlighting

### File Navigation Sidebar

When viewing diffs with multiple files, DiffLens automatically displays a sidebar that:
- Lists all changed files with icons
- Shows additions (+) and deletions (-) per file
- Highlights new and deleted files with badges
- Enables quick navigation by clicking on any file
- Auto-shows when viewing diffs with multiple files
- Can be toggled using the "Show Files" / "Hide Files" button
- **Stays fixed** when scrolling through diff content for easy access

### Display Settings

Access the settings menu (⚙️ icon) to customize your diff viewing experience:
- **Expand All Files**: Toggle to show all file diffs expanded or collapsed by default
- Settings are automatically saved to your browser's local storage
- Individual files can be manually collapsed/expanded by clicking their headers

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: TailwindCSS
- **Architecture**: Client-side only (no backend required)
- **Hosting**: GitHub Pages ready

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines

- Use modern JavaScript (ES6+)
- Follow consistent code formatting
- Maintain the privacy-first approach
- Test thoroughly across different browsers
- Keep the design clean and minimal

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Privacy & Security

DiffLens is designed with privacy as a core principle:

- **No Data Collection**: We don't collect, store, or track any of your data
- **Client-Side Processing**: Your diffs never leave your browser
- **No Analytics**: No tracking scripts or analytics tools
- **Offline Capable**: Works completely offline once loaded
- **Open Source**: Full transparency with open source code

## Acknowledgments

- Thanks to all contributors who help make DiffLens better
- Inspired by the need for privacy-focused developer tools
- Built for the developer community

## Support

- [Report Issues](https://github.com/nbslabs/difflense/issues)
- [Start a Discussion](https://github.com/nbslabs/difflense/discussions)
- ⭐ [Star the Repository](https://github.com/nbslabs/difflense)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=FSoft-AI4Code/CodeWiki,nbslabs/difflense&type=date&legend=top-left)](https://www.star-history.com/#FSoft-AI4Code/CodeWiki&nbslabs/difflense&type=date&legend=top-left)

<div align="center">
  <strong>Made with ❤️ for developers who value privacy</strong>
</div>
DiffLens is a developer tool to visualize code changes from git diff. Upload a diff file or paste raw diff text to explore changes with a clean, structured view. Built for clarity, it helps developers review, analyze, and share code diffs more effectively.

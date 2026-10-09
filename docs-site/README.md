# docs-site

The documentation for mraeron.tech, built with Docusaurus. The pages are Markdown files in `docs/`.

```bash
bun install
bun run start      # http://localhost:3000, reloads on save
bun run build      # into build/; fails on any broken link
```

The sidebar follows the folders in `docs/`. Each page's `sidebar_position` sets its order, and each folder's
`_category_.json` sets its label.

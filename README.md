<h1 align="center">
  Github Pull Request Pretty Link
</h1>

<h3 align="center">
  <b><a href="https://chromewebstore.google.com/detail/github-pr-pretty-link/nmpojdflbpoepmmchmffpiccbhncpllf">chrome</a></b>
  <span> • </span>
  <b><a href="https://addons.mozilla.org/en-GB/firefox/addon/github-pr-pretty-link/">firefox</a></b>
</h3>

Browser extension to copy a link from the current active tab so that your teammates can see what the Pull Request is about before clicking.


## Building

This extension is built on a `linux/amd64` machine. If dependencies are replicated, it can be possible to build it in other
OSes or architecture combinations.

Dependencies:

- [node/lts](https://nodejs.org/en/download)
- [pnpm](https://pnpm.io/installation)
- [bash](https://packages.debian.org/sid/bash)
- [zip](https://packages.debian.org/sid/zip)

Run:

```bash
pnpm install
pnpm build
```

The resulting package will be under `./dist/app`.

### Packaging for release

To generate the zip package to submit to the browser extension stores, run:

```bash
pnpm package
```

The package will be under `./dist/package.zip`.
